const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { createAuth } = require('./auth.cjs');
const MOBILE_ORIGIN = 'https://sportsensemble.android';
const routes = new Map([
  ['/api/auth/login', 'POST'], ['/api/auth/logout', 'POST'], ['/api/auth/mobile-agenda', 'GET']
]);

function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function createMobileServer(auth) {
  const server = http.createServer((req, res) => {
    if (req.url === '/download/agenda.apk' && ['GET', 'HEAD'].includes(req.method)) {
      const apk = path.join(__dirname, 'android', 'SportsEnsemble-Agenda.apk');
      if (!fs.existsSync(apk)) return reply(res, 404, { error: 'Installation bientôt disponible.' });
      const stream = fs.createReadStream(apk);
      stream.once('open', () => {
        res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': 'attachment; filename="SportsEnsemble-Agenda.apk"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': fs.statSync(apk).size });
        if (req.method === 'HEAD') { stream.destroy(); return res.end(); }
        stream.pipe(res);
      });
      stream.once('error', () => { if (!res.headersSent) reply(res, 503, { error: 'Téléchargement indisponible.' }); else res.destroy(); });
      return;
    }
    if (req.url === '/health' && req.method === 'GET') return reply(res, 200, { app: 'SportsEnsemble Agenda', version: 1 });
    if (routes.get(req.url) !== req.method) return reply(res, 404, { error: 'Adresse introuvable.' });
    // This header is a client/CSRF boundary, not authentication. The session is checked by createAuth.
    // No CORS is enabled. Browser cross-origin preflights and all write-to-agenda routes are rejected.
    if (req.headers.origin !== MOBILE_ORIGIN || req.headers['x-sportsensemble-client'] !== 'android-v1') {
      return reply(res, 403, { error: 'Utilise l’application SportsEnsemble Agenda.' });
    }
    return auth(req, res, req.url);
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 15000;
  return server;
}
async function startMobileServer() {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const port = Number(process.env.MOBILE_PORT || 9012);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('MOBILE_PORT invalide.');
  const dbName = process.env.MONGODB_DB || 'sportsensemble';
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName) || ['local', 'admin', 'config'].includes(dbName)) throw Error('Base applicative invalide.');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const auth = await createAuth(client.db(dbName), { origin: MOBILE_ORIGIN, secureCookie: true });
    const server = createMobileServer(auth);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    const close = async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await client.close(); };
    return { server, close };
  } catch (error) { await client.close(); throw error; }
}
if (require.main === module) startMobileServer().then(({ server, close }) => {
  console.log(`Service agenda mobile prêt sur 127.0.0.1:${server.address().port}. Utiliser une passerelle HTTPS pour Android.`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await close(); process.exit(0); });
}).catch(error => { console.error(error.code === 'EADDRINUSE' ? 'Le port mobile est déjà utilisé.' : 'Service mobile indisponible : vérifier MongoDB et .env.'); process.exitCode = 1; });
module.exports = { createMobileServer, startMobileServer, MOBILE_ORIGIN };
