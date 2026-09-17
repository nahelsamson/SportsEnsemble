const {test}=require('node:test'), assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},AixCore:{escape:s=>String(s)},URL};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('clubs-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('directory.js','utf8'),ctx);
const rows=ctx.window.CLUB_DIRECTORY,D=ctx.window.Directory;
test('Annuaire : couverture du classeur et images présentes',()=>{
 assert.equal(rows.length,546);assert.equal(rows.filter(x=>x.kind==='club').length,379);
 assert.equal(new Set(rows.map(x=>x.id)).size,546);
 for(const x of rows){assert.ok(x.name);assert.ok(fs.existsSync(path.join('.',x.image)));assert.ok(x.sourceRow>=2);
  // A leading slash drops /SportsEnsemble/ on GitHub Pages and breaks the image.
  const image = D.detail(x.id).match(/<img[^>]+src="([^"]+)"/)[1];
  for(const base of ['https://nahelsamson.github.io/SportsEnsemble/','http://localhost:9010/']) {
   const resolved = new URL(image,base);assert.ok(resolved.href.startsWith(base+'assets/clubs/'));
  }
 }
 assert.equal(rows.filter(x=>x.imageSource).length,3);
});
test('Recherche sans accents, filtres et contenus locaux préservés',()=>{
 D.state.q='equitation';assert.ok(D.results([]).length>0);
 D.state.q='';D.state.kind='lieu';assert.equal(D.results([]).length,167);
 D.state.kind='club';D.state.discipline='Rugby';assert.equal(D.results([]).length,4);
 D.state.discipline='';const before=D.results([]).length;
 assert.equal(D.results([{id:'local',title:'Mon club',type:'club',status:'published',sport:'Tennis',body:'',venue:''}]).length,before+1);
});
test('Liens externes : protocoles dangereux refusés et domaines conservés',()=>{
 assert.equal(D.website('javascript:alert(1)'),'');assert.equal(D.website('Facebook aucmuaythai'),'');
 assert.equal(D.website('https://user:password@example.com'),'');
 assert.equal(D.website('club.fr'),'https://club.fr/');
 assert.ok(D.detail(rows[0].id).includes('Informations pratiques'));
});
