const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { MongoClient, ObjectId } = require('mongodb');
const { createAuth } = require('../auth.cjs');
const { createServer } = require('../server.cjs');

test('Avis partagés et immuables entre Android et GitHub Pages', async t => {
  const client = new MongoClient(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', {serverSelectionTimeoutMS:5000});
  const name = 'sportsensemble_test_' + randomUUID().replaceAll('-', '');
  await client.connect(); const db = client.db(name);
  const origin = 'https://sportsensemble.example', pages = 'https://nahelsamson.github.io';
  let server;
  async function start() { server = createServer(await createAuth(db, {origin, secureCookie:true, tokenOrigins:[pages]})); server.listen(0,'127.0.0.1'); await once(server,'listening'); }
  async function stop() { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
  t.after(async () => { await stop(); if (/^sportsensemble_test_[a-f0-9]{32}$/.test(name)) await db.dropDatabase(); await client.close(); });
  await start();
  async function call(endpoint, {body, headers={}, method=body===undefined?'GET':'POST'}={}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${endpoint}`, {method, headers:{Origin:origin,'Content-Type':'application/json',...headers}, ...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status, body:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const mobile = await call('register', {body:{name:'Camille mobile',email:'mobile@example.invalid',password:'password test sufficiently long'}});
  const remote = await call('register', {body:{name:'Alex web',email:'web@example.invalid',password:'password test sufficiently long'},headers:{Origin:pages,'X-Session-Mode':'token'}});
  assert.equal(mobile.status,201); assert.equal(remote.status,201);
  const phone = {Cookie:mobile.cookie};
  const browser = {Origin:pages,'X-Session-Mode':'token',Authorization:'Bearer '+remote.body.sessionToken};
  const payload = {rating:8,comment:'Très pratique pour ma semaine.',requestId:randomUUID()};
  let id;
  await t.test('lecture publique ; connexion et origine obligatoires pour publier', async () => {
    assert.equal((await call('reviews')).status,200);
    assert.equal((await call('reviews',{body:payload})).status,401);
    assert.equal((await call('reviews',{body:payload,headers:{...phone,Origin:'https://evil.invalid'}})).status,403);
    assert.equal((await call('reviews',{body:payload,headers:{...phone,Origin:''}})).status,403);
  });
  await t.test('auteur et date issus du serveur ; aucun e-mail ni identifiant privé exposé', async () => {
    const response = await call('reviews',{headers:phone,body:{...payload,authorName:'Usurpation',authorId:'injected',createdAt:'2000-01-01'}});
    assert.equal(response.status,201); const review=response.body.review; id=review.id;
    assert.equal(review.authorName,'Camille mobile'); assert.equal(review.rating,8);
    assert.ok(Date.now()-Date.parse(review.createdAt)<10000);
    assert.deepEqual(Object.keys(review).sort(),['authorName','comment','createdAt','id','rating']);
    const list=await call('reviews',{headers:browser}); assert.equal(list.body.reviews[0].id,id);
  });
  await t.test('notes, commentaires et identifiants de publication validés', async () => {
    for (const rating of [-1,11,7.5,'8',null,{$gt:0}]) assert.equal((await call('reviews',{headers:phone,body:{...payload,rating}})).status,400);
    for (const comment of ['', '   ', 'a'.repeat(2001), null, {$ne:null}]) assert.equal((await call('reviews',{headers:phone,body:{...payload,comment}})).status,400);
    for (const requestId of ['',{},'random']) assert.equal((await call('reviews',{headers:phone,body:{...payload,requestId}})).status,400);
    assert.equal(await db.collection('reviews').countDocuments(),1);
  });
  await t.test('réessais simultanés sans doublon ; publication web visible sur mobile', async () => {
    const replies = await Promise.all([call('reviews',{body:payload,headers:phone}),call('reviews',{body:payload,headers:phone})]);
    replies.forEach(r=>{assert.equal(r.status,200);assert.equal(r.body.review.id,id);});
    assert.equal((await call('reviews',{body:{...payload,rating:9},headers:phone})).status,409);
    const web = await call('reviews',{body:{rating:10,comment:'<img src=x onerror=alert(1)> & avis web',requestId:randomUUID()},headers:browser});
    assert.equal(web.status,201);
    const read = await call('reviews',{headers:phone}); assert.equal(read.body.total,2); assert.equal(read.body.reviews[0].authorName,'Alex web');
    assert.equal((await call('reviews',{headers:browser,body:{rating:0,comment:'Note minimale acceptée.',requestId:randomUUID()}})).status,201);
  });
  await t.test('aucune modification ou suppression, y compris par l’auteur', async () => {
    for (const headers of [phone,browser]) for (const method of ['PUT','PATCH','DELETE']) for (const path of ['reviews','reviews/'+id]) {
      assert.equal((await call(path,{method,headers,body:{rating:1,comment:'Modifié'}})).status,405);
    }
    assert.equal((await db.collection('reviews').findOne({_id:new ObjectId(id)})).rating,8);
  });
  await t.test('persistance après redémarrage et pagination complète sans doublon', async () => {
    await stop(); await start();
    assert.equal((await call('reviews')).body.total,3);
    await db.collection('reviews').insertMany(Array.from({length:24},(_,i)=>({_id:new ObjectId(),authorId:new ObjectId(mobile.body.user.id),authorName:'Fixture',rating:i%11,comment:'Avis pagination '+i,requestId:randomUUID(),createdAt:new Date()})));
    const first = await call('reviews'); assert.equal(first.body.reviews.length,20); assert.equal(first.body.total,27);
    const second = await call('reviews?before='+first.body.nextCursor);
    assert.equal(second.body.reviews.length,7); assert.equal(second.body.nextCursor,null);
    assert.equal(new Set([...first.body.reviews,...second.body.reviews].map(r=>r.id)).size,27);
    assert.equal((await call('reviews?before=invalid')).status,400);
  });
});
