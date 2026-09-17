const {test}=require('node:test'),assert=require('node:assert/strict'),W=require('../week-core.js'),clubs=require('../agenda-catalog.cjs');
const s=(id,start,end,day=0)=>({id,clubId:clubs[0].id,day,start,end,source:'confirmed',confirmed:true});
test('Chevauchements partiels, inclusions et doublons refusés; séances contiguës acceptées',()=>{
 for(const [a,b] of [[s('a',600,660),s('b',630,700)],[s('a',600,660),s('b',610,620)],[s('a',600,660),s('b',600,660)]])assert.throws(()=>W.validate([a,b],clubs),/Chevauchement/);
 assert.equal(W.validate([s('a',600,660),s('b',660,700)],clubs).length,2);
 assert.equal(W.validate([s('a',600,660),s('b',600,660,1)],clubs).length,2);
});
test('Horaires invalides, jours et clubs inconnus rejetés',()=>{
 for(const x of [s('a',600,600),s('a',700,600),s('a',600,1500),s('a',600,700,7),{...s('a',600,700),clubId:'unknown'},{...s('a',600,700),confirmed:false}])assert.throws(()=>W.validate([x],clubs));
 assert.equal(W.minutes('24:00'),1440);assert.ok(Number.isNaN(W.minutes('25:00')));assert.ok(Number.isNaN(W.minutes('18:78')));
});
test('Propositions conservatrices et bornes imposées',()=>{
 const c={...clubs[0],fields:{Horaires:'Mar 18h-19h, Mer 15h-17h'}};
 const ps=W.proposals(c);assert.equal(ps.length,2);assert.equal(ps[0].day,1);
 const a={...s('a',1080,1140,1),source:'proposal',proposalKey:ps[0].key};
 assert.equal(W.validate([a],[c]).length,1);
 assert.throws(()=>W.validate([{...a,end:1200}],[c]),/horaire/);
 assert.equal(W.proposals({...c,fields:{Horaires:'Selon planning'}}).length,0);
 assert.equal(W.proposals({...c,fields:{Horaires:'Lun-ven 8h-20h'}}).length,0);
 assert.equal(W.proposals({...c,fields:{Horaires:'Tous les jours 7h-22h'}}).length,7);
});
test('Créneaux enfants masqués pour un adulte',()=>{
 const c={...clubs[0],fields:{Horaires:'Mer 17h30-18h30 (enfants 9-12 ans), Mer 19h-20h45 (adultes)'}};
 assert.equal(W.proposals(c,22).length,1);
 assert.equal(W.proposals(c,10).length,1);
 const p=W.proposals(c,10)[0];
 assert.throws(()=>W.validate([{id:'age',clubId:c.id,day:p.day,start:p.start,end:p.end,source:'proposal',proposalKey:p.key}],[c],22));
});
test('Seulement les clubs ajoutés, sans élargissement à toute la discipline',()=>{
 const a={selectedIds:[clubs[0].id],sports:[clubs[0].discipline]};
 assert.deepEqual(W.eligible(clubs,a).map(x=>x.id),[clubs[0].id]);
 assert.equal(W.eligible(clubs,{selectedIds:[],sports:['Tennis']}).length,0);
 assert.throws(()=>W.validate([s('a',600,660)],clubs,22,{selectedIds:[]}),/agenda/);
});
test('Pas de saisie libre ni raccourcissement quand les horaires sont connus',()=>{
 const c={...clubs[0],fields:{Horaires:'Mar 18h-19h'}};
 assert.throws(()=>W.validate([s('a',1080,1140,1)],[c],22),/horaire/);
 assert.throws(()=>W.validate([{...s('a',1080,1110,1),source:'proposal',proposalKey:'1-1080-1140'}],[c],22),/horaire/);
});
test('Une ancienne séance est conservable ou retirable, mais pas modifiable hors sélection',()=>{
 const old=s('old',600,660);
 assert.equal(W.validate([old],clubs,22,{selectedIds:[],previous:[old]}).length,1);
 assert.equal(W.validate([],clubs,22,{selectedIds:[],previous:[old]}).length,0);
 assert.throws(()=>W.validate([{...old,start:610}],clubs,22,{selectedIds:[],previous:[old]}),/agenda/);
});
