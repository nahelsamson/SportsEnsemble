const fs=require('fs'),vm=require('vm');const c={window:{}};for(const f of ['clubs-data.js','map-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),c);
const rows=c.window.CLUB_DIRECTORY,geo=c.window.CLUB_GEO;
const cachePath='scripts/poi-cache.json',cache=fs.existsSync(cachePath)?JSON.parse(fs.readFileSync(cachePath,'utf8')):{};
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,' ').split(/\s+/).filter(w=>w.length>2&&!['aix','provence','les','des','public','complexe','sportif','gymnase','stade','piscine'].includes(w));
(async()=>{
for(const x of rows.filter(x=>!geo.records[x.id].lat&&geo.records[x.id].query)){
 if(/toutes|réseau/i.test(x.name))continue;
 const q=x.name.replace(/\([^)]*\)/g,'').trim()+' Aix-en-Provence';
 if(!(q in cache)){try{const u=new URL('https://data.geopf.fr/geocodage/search');u.search=new URLSearchParams({q,index:'poi',citycode:'13001',limit:'3'});let r=await fetch(u,{signal:AbortSignal.timeout(12000)});if(!r.ok)continue;cache[q]=(await r.json()).features||[];}catch{continue}await new Promise(r=>setTimeout(r,100));}
 const words=norm(x.name.replace(/\([^)]*\)/g,''));
 const f=cache[q].find(f=>{const p=f.properties,got=norm(p.toponym||p.name),match=words.filter(w=>got.includes(w)).length;return p.score>=.6&&words.length>=2&&match/words.length>=.8&&match/got.length>=.55&&[].concat(p.citycode||[]).includes('13001')});
 if(f){const old=geo.records[x.id];geo.records[x.id]={lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],precision:'poi',label:f.properties.toponym||String(f.properties.name),score:f.properties.score,query:old.query,source:'IGN BD TOPO — recherche du nom du lieu'};
 // Same exact queried address can reuse a recognized facility, keeping the precision explicit.
 for(const y of rows){const g=geo.records[y.id];if(!g.lat&&g.query&&g.query===old.query)geo.records[y.id]={...geo.records[x.id]};}
 console.log(x.name+' => '+geo.records[x.id].label);}
}
fs.writeFileSync(cachePath,JSON.stringify(cache,null,2));
fs.writeFileSync('map-data.js','window.CLUB_GEO = '+JSON.stringify(geo,null,2)+';\n');
console.log('Localisées : '+Object.values(geo.records).filter(x=>x.lat).length);
})();
