const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {MongoClient}=require('mongodb');
const {startPublicSite}=require('../scripts/site-remote.cjs');

test('site public HTTPS : comptes, planning, origine et fichiers privés',async t=>{
  const uri=process.env.TEST_MONGODB_URI||'mongodb://127.0.0.1:27017';
  const dbName='sportsensemble_test_public_'+randomUUID().replaceAll('-','');
  const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000});
  const origin='https://sportsensemble.example';let service;
  t.after(async()=>{if(service)await service.close();if(/^sportsensemble_test_public_[a-f0-9]{32}$/.test(dbName))await client.db(dbName).dropDatabase();await client.close();});
  await client.connect();
  await assert.rejects(startPublicSite({origin:'http://sportsensemble.example',uri,dbName,port:0}),/HTTPS/);
  service=await startPublicSite({origin,uri,dbName,port:0});
  assert.equal(service.server.address().address,'127.0.0.1');
  const base='http://127.0.0.1:'+service.server.address().port;
  async function request(endpoint,body,cookie,requestOrigin=origin){
    const r=await fetch(base+'/api/auth/'+endpoint,{...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)}),headers:{Origin:requestOrigin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}});
    return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};
  }
  for(const asset of ['/','/vendor/leaflet.js','/clubs-data.js'])assert.equal((await fetch(base+asset)).status,200);
  for(const file of ['/.env','/.private/atlas-connection.json','/server.cjs','/site-public-url.txt'])assert.equal((await fetch(base+file)).status,404);
  const account={name:'Essai public',email:'public@example.invalid',password:'Mot de passe de verification 2026!'};
  assert.equal((await request('register',account,null,'https://foreign.example')).status,403);
  const registered=await request('register',account);assert.equal(registered.status,201);assert.match(registered.cookie,/; Secure/);assert.match(registered.cookie,/HttpOnly/);assert.match(registered.cookie,/SameSite=Strict/);
  const cookie=registered.cookie.split(';')[0];
  const agenda={age:22,sports:['Arts martiaux'],selectedIds:['aix-01-007']};
  assert.equal((await request('agenda',agenda)).status,401);
  assert.equal((await request('agenda',agenda,cookie)).status,200);
  const session={id:'seance-public',clubId:'aix-01-007',day:1,start:1080,end:1140,source:'proposal',proposalKey:'1-1080-1140'};
  assert.equal((await request('week',{revision:0,sessions:[session]},cookie)).status,200);
  const stored=await client.db(dbName).collection('users').findOne({email:account.email});
  assert.deepEqual(stored.agenda,agenda);assert.deepEqual(stored.weeklyPlan.sessions,[session]);
  const me=await request('me',undefined,cookie);assert.equal(me.body.user.id,String(stored._id));assert.equal(me.body.user.passwordHash,undefined);assert.deepEqual(me.body.user.weeklyPlan.sessions,[session]);
  assert.equal((await request('logout',{},cookie)).status,200);
  assert.equal((await request('me',undefined,cookie)).body.user,null);
  await service.close();
  service=await startPublicSite({origin:'https://next.example',uri,dbName,port:0});
  const newBase='http://127.0.0.1:'+service.server.address().port;
  const obsolete=await fetch(newBase+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(account)});
  assert.equal(obsolete.status,403);
  const login=await fetch(newBase+'/api/auth/login',{method:'POST',headers:{Origin:'https://next.example','Content-Type':'application/json'},body:JSON.stringify(account)});
  assert.equal(login.status,200);assert.equal((await login.json()).user.id,String(stored._id));
});
