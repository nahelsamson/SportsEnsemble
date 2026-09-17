const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { MongoClient } = require('mongodb');
const { createAuth, tokenHash } = require('../auth.cjs');
const { createServer } = require('../server.cjs');

test('Comptes et sessions avec une vraie base MongoDB isolée', async t => {
  const client = new MongoClient(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  const name = 'sportsensemble_test_' + randomUUID().replaceAll('-', '');
  let server;
  await client.connect();
  const db = client.db(name), origin = 'http://localhost:9010';
  async function start() {
    server = createServer(await createAuth(db, { origin }));
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
  }
  async function stop() { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); server = null; } }
  t.after(async () => { await stop(); if (/^sportsensemble_test_[a-f0-9]{32}$/.test(name)) await db.dropDatabase(); await client.close(); });
  await start();
  async function request(endpoint, body, cookie, customOrigin = origin) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${endpoint}`, {
      ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
      headers: { 'Content-Type': 'application/json', Origin: customOrigin, ...(cookie ? { Cookie: cookie } : {}) }
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  const account = { name: 'Compte test', email: 'test@example.invalid', password: 'Phrase de passe de test 42!' };
  let cookie, userId;
  await t.test('inscription, normalisation et champs protégés', async () => {
    const r = await request('register', { ...account, email: ' TEST@EXAMPLE.INVALID ', role: 'admin', passwordHash: 'injected' });
    assert.equal(r.status, 201); assert.equal(r.body.user.email, account.email); assert.equal(r.body.user.passwordHash, undefined);
    assert.match(r.cookie, /HttpOnly/); assert.match(r.cookie, /SameSite=Strict/); cookie = r.cookie.split(';')[0]; userId = r.body.user.id;
    const stored = await db.collection('users').findOne({ email: account.email });
    assert.match(stored.passwordHash, /^scrypt\$/); assert.notEqual(stored.passwordHash, account.password);
    assert.equal(stored.password, undefined); assert.equal(stored.role, undefined);
    const session = await db.collection('sessions').findOne({ userId: stored._id });
    assert.equal(session.token, undefined); assert.equal(session.tokenHash, tokenHash(cookie.split('=')[1]));
  });
  await t.test('e-mail unique, y compris majuscules', async () => { assert.equal((await request('register', { ...account, email: 'TEST@example.invalid' })).status, 409); assert.equal(await db.collection('users').countDocuments(), 1); });
  await t.test('mot de passe faible et injection MongoDB refusés', async () => {
    assert.equal((await request('register', { ...account, email: 'other@example.invalid', password: 'short' })).status, 400);
    assert.equal((await request('login', { email: { $ne: null }, password: account.password })).status, 400);
  });
  await t.test('connexion erronée générique', async () => {
    const wrong = await request('login', { ...account, password: 'incorrect' });
    const absent = await request('login', { ...account, email: 'absent@example.invalid' });
    assert.equal(wrong.status, 401); assert.deepEqual(absent.body, wrong.body);
  });
  await t.test('origine tierce et session fabriquée refusées', async () => {
    assert.equal((await request('login', account, null, 'http://evil.invalid')).status, 403);
    assert.equal((await request('me', undefined, 'sportsensemble_session=' + 'a'.repeat(64))).body.user, null);
  });
  await t.test('session conservée après redémarrage du serveur', async () => {
    await stop(); await start(); assert.equal((await request('me', undefined, cookie)).body.user.id, userId);
  });
  await t.test('agendas privés, validation et persistance MongoDB', async () => {
    const payload = { age: 16, sports: ['Rugby'], selectedIds: ['aix-01-206'] };
    assert.equal((await request('agenda',payload)).status,401);
    assert.equal((await request('agenda',payload,cookie,'http://evil.invalid')).status,403);
    assert.equal((await request('agenda',{...payload,age:-1},cookie)).status,400);
    assert.equal((await request('agenda',{...payload,sports:[{$ne:null}]},cookie)).status,400);
    assert.equal((await request('agenda',{...payload,selectedIds:['absent']},cookie)).status,400);
    const second=await request('register',{name:'Autre test',email:'second@example.invalid',password:account.password});
    const secondCookie=second.cookie.split(';')[0];
    const saved=await request('agenda',{...payload,userId:second.body.user.id},cookie);
    assert.equal(saved.status,200);assert.deepEqual(saved.body.user.agenda,payload);
    assert.equal((await request('me',undefined,secondCookie)).body.user.agenda,null);
    await stop();await start();
    assert.deepEqual((await request('me',undefined,cookie)).body.user.agenda,payload);
    assert.equal((await request('me',undefined,secondCookie)).body.user.agenda,null);
  });
  await t.test('planning privé, conflits, concurrence et persistance', async () => {
    const session={id:'seance1',clubId:'aix-01-206',day:1,start:1080,end:1140,source:'confirmed',confirmed:true};
    assert.equal((await request('week',{revision:0,sessions:[session]})).status,401);
    assert.equal((await request('week',{revision:0,sessions:[session]},cookie,'http://evil.invalid')).status,403);
    assert.equal((await request('week',{revision:0,sessions:[session,{...session,id:'seance2',start:1100}]},cookie)).status,400);
    assert.equal((await request('week',{revision:0,sessions:[{...session,clubId:'aix-01-007'}]},cookie)).status,400);
    const attempts=await Promise.all([request('week',{revision:0,sessions:[session]},cookie),request('week',{revision:0,sessions:[session]},cookie)]);
    assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);
    assert.equal((await db.collection('users').findOne({email:'second@example.invalid'})).weeklyPlan,undefined);
    await stop();await start();
    const p=(await request('me',undefined,cookie)).body.user.weeklyPlan;
    assert.equal(p.revision,1);assert.equal(p.sessions[0].id,'seance1');
    assert.equal((await request('agenda',{age:20,sports:['Rugby'],selectedIds:[]},cookie)).status,200);
    assert.equal((await request('me',undefined,cookie)).body.user.weeklyPlan.sessions.length,1);
    assert.equal((await request('week',{revision:1,sessions:[]},cookie)).status,200);
  });
  await t.test('horaires exacts imposés pour un club sélectionné',async()=>{
    await request('agenda',{age:22,sports:['Arts martiaux'],selectedIds:['aix-01-007']},cookie);
    const revision=(await request('me',undefined,cookie)).body.user.weeklyPlan.revision;
    const s={id:'dojo',clubId:'aix-01-007',day:1,start:1080,end:1140,source:'proposal',proposalKey:'1-1080-1140'};
    assert.equal((await request('week',{revision,sessions:[{...s,end:1110}]},cookie)).status,400);
    assert.equal((await request('week',{revision,sessions:[{...s,source:'confirmed',confirmed:true}]},cookie)).status,400);
    assert.equal((await request('week',{revision,sessions:[s]},cookie)).status,200);
    await request('week',{revision:revision+1,sessions:[]},cookie);
  });
  await t.test('application mobile : session obligatoire et données du seul compte connecté', async () => {
    assert.equal((await request('mobile-agenda')).status,401);
    const mine=await request('mobile-agenda',undefined,cookie);
    assert.equal(mine.status,200);assert.equal(mine.body.user.id,userId);
    assert.deepEqual(mine.body.clubs.map(c=>c.id),['aix-01-007']);
    assert.equal(mine.body.user.email,undefined);assert.equal(mine.body.user.passwordHash,undefined);
    const other=await request('login',{email:'second@example.invalid',password:account.password});
    const theirs=await request('mobile-agenda',undefined,other.cookie.split(';')[0]);
    assert.equal(theirs.status,200);assert.notEqual(theirs.body.user.id,userId);
    assert.deepEqual(theirs.body.clubs,[]);assert.deepEqual(theirs.body.sessions,[]);
  });
  await t.test('déconnexion et rejet du cookie réutilisé', async () => {
    const r = await request('logout', {}, cookie); assert.equal(r.status, 200); assert.match(r.cookie, /Max-Age=0/);
    assert.equal((await request('me', undefined, cookie)).body.user, null);
  });
  await t.test('reconnexion et expiration vérifiée sans attendre TTL', async () => {
    const r = await request('login', account); assert.equal(r.status, 200); cookie = r.cookie.split(';')[0];
    assert.equal((await request('me', undefined, cookie)).body.user.id, userId);
    await db.collection('sessions').updateOne({ tokenHash: tokenHash(cookie.split('=')[1]) }, { $set: { expiresAt: new Date(0) } });
    assert.equal((await request('me', undefined, cookie)).body.user, null);
  });
  await t.test('cookie sécurisé activable pour HTTPS', async () => {
    await stop(); server = createServer(await createAuth(db, { origin, secureCookie: true })); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const r = await request('login', account); assert.match(r.cookie, /; Secure/);
  });
  await t.test('fichiers serveur et configuration non exposés', async () => {
    for (const p of ['/auth.cjs', '/.env', '/package.json', '/../server.cjs']) {
      assert.equal((await fetch(`http://127.0.0.1:${server.address().port}${p}`)).status, 404);
    }
  });
  await t.test('limitation des tentatives', async () => {
    for (let i = 0; i < 20; i++) await request('login', { email: 'invalid', password: 'invalid' });
    assert.equal((await request('login', account)).status, 429);
  });
});
