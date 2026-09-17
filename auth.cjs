const WeekCore = require('./week-core.js');
const AgendaCore = require('./agenda-core.js');
const agendaClubs = require('./agenda-catalog.cjs');
const { mobileAgenda } = require('./mobile-agenda.cjs');
const { randomBytes, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const derive = require('node:util').promisify(scrypt);
const TTL = 604800, COOKIE = 'sportsensemble_session';
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function normalizeEmail(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'Adresse e-mail invalide.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Adresse e-mail invalide.');
  return email;
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, SCRYPT);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [scheme, salt, hex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hex)) return false;
  return timingSafeEqual(await derive(password, salt, 64, SCRYPT), Buffer.from(hex, 'hex'));
}
function tokenFrom(req) {
  if (req.headers['x-session-mode'] === 'token') {
    return /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1] || null;
  }
  const entry = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  const token = entry?.slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const publicUser = user => ({ id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt, agenda: user.agenda || null, weeklyPlan: user.weeklyPlan || {revision:0,sessions:[]} });
async function readJSON(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Un contenu JSON est requis.');
  let length = 0; const chunks = [];
  for await (const chunk of req) { length += chunk.length; if (length > 16384) throw new HttpError(413, 'Formulaire trop volumineux.'); chunks.push(chunk); }
  let data; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Formulaire invalide.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Formulaire invalide.');
  return data;
}
function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(JSON.stringify(data));
}
async function createAuth(db, { origin = 'http://localhost:9010', secureCookie = false, tokenOrigins = [] } = {}) {
  const remoteOrigins = new Set(tokenOrigins);
  for (const value of remoteOrigins) {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.origin !== value || value === origin) throw Error('Origine distante invalide.');
  }
  const tokenMode = req => req.headers['x-session-mode'] === 'token';
  const allowedOrigin = req => req.headers.origin === origin || (tokenMode(req) && remoteOrigins.has(req.headers.origin));
  const users = db.collection('users'), sessions = db.collection('sessions');
  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  const attempts = new Map(); let hashing = 0;
  const cookie = (token, age) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookie ? '; Secure' : ''}`;
  async function withHash(fn) {
    if (hashing >= 2) throw new HttpError(429, 'Trop de demandes simultanées. Réessaie dans quelques secondes.');
    hashing++; try { return await fn(); } finally { hashing--; }
  }
  function rateLimit(req) {
    const now = Date.now(); for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.socket.remoteAddress, value = attempts.get(key) || { count: 0, until: now + 900000 };
    if (value.count >= 20) throw new HttpError(429, 'Trop de tentatives. Réessaie dans 15 minutes.');
    value.count++; attempts.set(key, value);
  }
  async function sessionUser(req) {
    const token = tokenFrom(req); if (!token) return null;
    const session = await sessions.findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
    if (session && (tokenMode(req) ? session.transport !== 'token' || session.audience !== req.headers.origin : session.transport === 'token')) return null;
    return session ? users.findOne({ _id: session.userId }) : null;
  }
  async function newSession(req, res, user, status) {
    const old = tokenFrom(req), token = randomBytes(32).toString('hex');
    await sessions.insertOne({ userId: user._id, tokenHash: tokenHash(token), createdAt: new Date(), expiresAt: new Date(Date.now() + TTL * 1000), ...(tokenMode(req) ? {transport:'token', audience:req.headers.origin} : {}) });
    if (old) await sessions.deleteOne({ tokenHash: tokenHash(old) });
    if (tokenMode(req)) return json(res, status, { user: publicUser(user), sessionToken: token });
    json(res, status, { user: publicUser(user) }, { 'Set-Cookie': cookie(token, TTL) });
  }
  return async function handleAuth(req, res, pathname) {
    try {
      const remote = remoteOrigins.has(req.headers.origin);
      if (req.headers.origin && req.headers.origin !== origin && !remote) throw new HttpError(403, 'Origine refusée.');
      if (remote) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
          const requested = (req.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
          if (!['GET', 'POST'].includes(req.headers['access-control-request-method']) || requested.some(x => !['authorization','content-type','x-session-mode'].includes(x))) throw new HttpError(403, 'Requête refusée.');
          res.writeHead(204, {'Access-Control-Allow-Methods':'GET, POST', 'Access-Control-Allow-Headers':'Authorization, Content-Type, X-Session-Mode', 'Access-Control-Max-Age':'600'});
          return res.end();
        }
        if (!tokenMode(req)) throw new HttpError(403, 'Connexion distante invalide.');
      } else if (tokenMode(req) || req.headers.authorization) throw new HttpError(403, 'Connexion distante refusée.');
      if (pathname === '/api/auth/me' && req.method === 'GET') { const user = await sessionUser(req); return json(res, 200, { user: user ? publicUser(user) : null }); }
      if (pathname === '/api/auth/mobile-agenda' && req.method === 'GET') {
        const user = await sessionUser(req);
        if (!user) throw new HttpError(401, 'Reconnecte-toi pour actualiser ton planning.');
        return json(res, 200, mobileAgenda(user));
      }
      if (pathname === '/api/auth/week') {
        if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
        if (!allowedOrigin(req)) throw new HttpError(403, 'Origine refusée.');
        const user = await sessionUser(req);
        if (!user) throw new HttpError(401, 'Reconnecte-toi pour enregistrer ta semaine.');
        const data = await readJSON(req);
        if (!Number.isInteger(data.revision) || data.revision < 0) throw new HttpError(400, 'Version du planning invalide.');
        let plan;
        try { plan = WeekCore.validate(data.sessions, agendaClubs, user.agenda?.age, {selectedIds:user.agenda?.selectedIds||[],previous:user.weeklyPlan?.sessions||[]}); }
        catch (error) { throw new HttpError(400, error.message); }
        const previous = user.weeklyPlan || {revision:0,sessions:[]};
        if (previous.revision !== data.revision) throw new HttpError(409, 'Ton planning a changé dans un autre onglet. Actualise la page avant de réessayer.');
        const weeklyPlan = {revision:data.revision+1,sessions:plan};
        const condition = user.weeklyPlan ? {'weeklyPlan.revision':data.revision} : {weeklyPlan:{$exists:false}};
        const result = await users.updateOne({_id:user._id,...condition},{$set:{weeklyPlan}});
        if (!result.matchedCount) throw new HttpError(409, 'Ton planning a changé. Actualise la page avant de réessayer.');
        return json(res,200,{user:publicUser({...user,weeklyPlan})});
      }
      if (pathname === '/api/auth/agenda') {
        if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
        if (!allowedOrigin(req)) throw new HttpError(403, 'Origine refusée.');
        const user = await sessionUser(req);
        if (!user) throw new HttpError(401, 'Reconnecte-toi pour enregistrer ton agenda.');
        const data = await readJSON(req);
        let agenda;
        try { agenda = AgendaCore.validate(data, agendaClubs); }
        catch (error) { throw new HttpError(400, error.message); }
        await users.updateOne({ _id: user._id }, { $set: { agenda } });
        return json(res, 200, { user: publicUser({ ...user, agenda }) });
      }
      if (!['/api/auth/register', '/api/auth/login', '/api/auth/logout'].includes(pathname)) throw new HttpError(404, 'Adresse introuvable.');
      if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
      if (!allowedOrigin(req)) throw new HttpError(403, 'Origine refusée. Ouvre le site à son adresse configurée.');
      if (pathname === '/api/auth/logout') { const token = tokenFrom(req); if (token) await sessions.deleteOne({ tokenHash: tokenHash(token) }); return json(res, 200, { user: null }, tokenMode(req) ? {} : { 'Set-Cookie': cookie('', 0) }); }
      rateLimit(req); const data = await readJSON(req), email = normalizeEmail(data.email);
      if (typeof data.password !== 'string' || data.password.length > 128 || !data.password.length) throw new HttpError(400, 'Mot de passe invalide.');
      if (pathname === '/api/auth/register') {
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Le nom doit contenir entre 2 et 80 caractères.');
        if (data.password.length < 12) throw new HttpError(400, 'Choisis un mot de passe d’au moins 12 caractères.');
        const passwordHash = await withHash(() => hashPassword(data.password));
        const user = { name, email, passwordHash, createdAt: new Date() };
        try { const result = await users.insertOne(user); user._id = result.insertedId; }
        catch (error) { if (error.code === 11000) throw new HttpError(409, 'Cette adresse e-mail possède déjà un compte.'); throw error; }
        return await newSession(req, res, user, 201);
      }
      const user = await users.findOne({ email });
      const matches = await withHash(() => verifyPassword(data.password, user?.passwordHash || dummyHash));
      if (!user || !matches) throw new HttpError(401, 'E-mail ou mot de passe incorrect.');
      return await newSession(req, res, user, 200);
    } catch (error) {
      json(res, error instanceof HttpError ? error.status : 503, { error: error instanceof HttpError ? error.message : 'La base de données est momentanément indisponible. Réessaie plus tard.' });
    }
  };
}
module.exports = { createAuth, hashPassword, verifyPassword, normalizeEmail, tokenHash };
