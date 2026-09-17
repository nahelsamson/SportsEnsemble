const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mobileAgenda } = require('../mobile-agenda.cjs');
const { createMobileServer, MOBILE_ORIGIN } = require('../mobile-server.cjs');

test('export mobile limité aux clubs choisis et aux séances enregistrées', () => {
  const club = id => ({id, name:id, discipline:'Rugby', fields:{Adresse:'Aix-en-Provence',Horaires:'Mar 18h-19h',Tarif:'À confirmer'}});
  const user = {_id:'user-a',name:'Alice',email:'private@example.invalid',passwordHash:'secret',agenda:{age:22,sports:['Rugby'],selectedIds:['a']},weeklyPlan:{revision:3,sessions:[{id:'s',clubId:'b',day:1,start:1080,end:1140,source:'confirmed',confirmed:true}]}};
  const data = mobileAgenda(user,[club('a'),club('b'),club('other')]);
  assert.deepEqual(data.user,{id:'user-a',name:'Alice'});
  assert.deepEqual(data.clubs.map(c=>[c.id,c.selected]),[['a',true],['b',false]]);
  assert.deepEqual(data.sessions,[{id:'s',clubId:'b',day:1,start:1080,end:1140}]);
  assert.match(data.clubs[0].directions,/^https:\/\/www.google.com\/maps\/dir\//);
  assert.equal(JSON.stringify(data).includes('secret'),false);
  assert.equal(JSON.stringify(data).includes('private@example.invalid'),false);
  assert.equal(JSON.stringify(data).includes('age'),false);
});

test('export mobile vide pour un compte sans agenda',()=>{
  const data=mobileAgenda({_id:'new',name:'Nouveau'});
  assert.deepEqual(data.sessions,[]); assert.deepEqual(data.clubs,[]); assert.deepEqual(data.sports,[]);
});

test('passerelle mobile : lecture protégée, aucune modification du planning ni fichier public',async t=>{
  const calls=[];
  const server=createMobileServer((req,res,p)=>{calls.push(p);res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
  const base=`http://127.0.0.1:${server.address().port}`;
  const headers={Origin:MOBILE_ORIGIN,'X-SportsEnsemble-Client':'android-v1'};
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/api/auth/mobile-agenda')).status,403);
  assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{...headers,Origin:'https://other.invalid'}})).status,403);
  assert.equal((await fetch(base+'/api/auth/mobile-agenda',{headers})).status,200);
  assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers})).status,200);
  assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers})).status,200);
  for(const p of ['/api/auth/register','/api/auth/agenda','/api/auth/week','/.env','/','/index.html','/api/auth/mobile-agenda?userId=someone']) {
    assert.equal((await fetch(base+p,{method:'POST',headers})).status,404,p);
    assert.equal((await fetch(base+p,{headers})).status,404,p);
  }
  const preflight=await fetch(base+'/api/auth/login',{method:'OPTIONS',headers});
  assert.equal(preflight.status,404);assert.equal(preflight.headers.get('access-control-allow-origin'),null);
  assert.deepEqual(calls,['/api/auth/mobile-agenda','/api/auth/login','/api/auth/logout']);
});
