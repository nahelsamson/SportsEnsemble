const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={AixCore:{escape:s=>String(s)}};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['clubs-data.js','map-data.js','sports-map.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const M=ctx.SportMap,rows=M.entries([]);
test('Carte : chaque fiche a un résultat de localisation explicite',()=>{
 assert.equal(rows.length,546);assert.equal(Object.keys(ctx.CLUB_GEO.records).length,546);
 for(const x of rows){assert.ok(x.geo);if(M.valid(x.geo)){assert.ok(x.geo.precision);assert.ok(x.geo.label);assert.ok(x.geo.score>=.5)}else assert.ok(x.geo.reason)}
});
test('Filtres combinés et recherche insensible aux accents',()=>{
 const opts={query:'',kind:'club',category:'',discipline:'Rugby'};
 assert.equal(M.filter(rows,opts).length,4);
 assert.ok(M.filter(rows,{...opts,discipline:'',query:'equitation'}).length>0);
 assert.equal(M.filter(rows,{...opts,kind:'lieu',discipline:''}).length,167);
 assert.equal(M.filter(rows,{...opts,query:'zzzintrouvable'}).length,0);
 const source=M.filter(rows,{...opts,kind:'',discipline:'',category:'Piscines (public)'});
 assert.equal(source.length,12);assert.ok(source.every(x=>x.category==='Piscines (public)'));
});
test('Repères partagés : aucune fiche localisée perdue',()=>{
 const groups=M.group(rows);const count=[...groups.values()].reduce((n,g)=>n+g.length,0);
 assert.equal(count,rows.filter(x=>M.valid(x.geo)).length);assert.ok([...groups.values()].some(g=>g.length>1));
 const sample=[{geo:{lat:43.52,lng:5.44}},{geo:{lat:43.52,lng:5.44}},{geo:{reason:'absent'}}];
 assert.equal(M.group(sample).size,1);assert.equal([...M.group(sample).values()][0].length,2);
});
test('Coordonnées invalides refusées, ajouts locaux gardés dans la liste',()=>{
 assert.equal(Boolean(M.valid({lat:NaN,lng:5})),false);assert.equal(Boolean(M.valid({lat:100,lng:5})),false);
 const items=[{id:'testlocal',title:'Club local',type:'club',status:'published',sport:'Tennis',venue:'Adresse nouvelle',body:''}];
 assert.equal(M.entries(items).length,547);assert.equal(M.entries(items).at(-1).local,true);
});
