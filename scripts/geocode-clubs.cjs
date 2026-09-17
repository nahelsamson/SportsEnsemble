/* Run manually: node scripts/geocode-clubs.cjs. Public addresses only are sent to IGN.
   Cache makes subsequent runs incremental. No browser/user coordinates collected. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),cacheFile=path.join(root,'scripts/geocode-cache.json');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'clubs-data.js'),'utf8'),context);
const rows=context.window.CLUB_DIRECTORY,cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
function query(row){let address=Object.entries(row.fields).find(([k])=>k.startsWith('Adresse'))?.[1]||'';if(!address)return '';
address=address.replace(/Cedex\s*\d*/gi,'').replace(/\b13(?:09[1-9])\b/g,'13090');
if(!/\b\d{5}\b|aix|marseille|meyrargues|venelles|vitrolles|gardanne|pertuis|lambesc|bouc|fuveau|cabri|trets|rousset|rognes|simiane|coudoux|velaux|eguilles|éguilles/i.test(address))address+=' Aix-en-Provence';
return address.trim();}

function cleaned(row) {
 const raw=query(row);
 if(!raw)return '';
 const isAix=/aix|puyricard|luynes|les milles|la duranne/i.test(raw);
 const road=raw.match(/(?:\d+\s*(?:bis|ter)?[,\s]*)?\b(?:rue|avenue|av\.|boulevard|bd\.?|chemin|route|place|allee|allée|cours|impasse|traverse|square|montee|montée|sentier)\b[^,;]*/i);
 if(!road)return raw;
 let street=road[0].replace(/\b(?:bat|bât|residence|résidence|villa|app)\b.*$/i,'').replace(/\b\d{5}\b.*$/,'').trim();
 if(isAix) street=street.replace(/\b(?:Aix-en-Provence|Puyricard|Luynes|Les Milles|La Duranne)\b.*$/i,'').trim();
 return street+' '+(isAix?'Aix-en-Provence':raw.slice(raw.search(/\b\d{5}\b/)));
}
function lookup(row){const q=cleaned(row),raw=query(row),aix=/aix|puyricard|luynes|les milles|la duranne/i.test(raw);
 return {q,aix};}
function terms(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bst\b/g,'saint').replace(/[^a-z]/g,' ').split(/\s+/).filter(t=>t.length>2&&!['rue','avenue','boulevard','chemin','route','place','allee','cours','impasse','traverse','square','montee','sentier','des','les','saint','aix','provence'].includes(t));}
const specs=rows.map(lookup).filter(x=>x.q);
const queries=[...new Set(specs.map(x=>JSON.stringify(x)))];let index=0,done=0;
async function worker(){while(index<queries.length){const q=queries[index++];if(cache[q])continue;
try{const spec=JSON.parse(q);const url=new URL('https://data.geopf.fr/geocodage/search');url.search=new URLSearchParams({q:spec.q,limit:'1',index:'address',...(spec.aix?{citycode:'13001'}:{})});
const res=await fetch(url,{signal:AbortSignal.timeout(15000)});
if(!res.ok)throw Error('HTTP '+res.status);
const data=await res.json(),f=data.features?.[0];cache[q]=f?{coordinates:f.geometry.coordinates,...f.properties}:{missing:true};
}catch(e){console.error('Requête non résolue:',e.message);continue}
if(++done%30===0){fs.writeFileSync(cacheFile,JSON.stringify(cache,null,2));console.log(done+' adresses traitées')}
await new Promise(r=>setTimeout(r,150));}}
(async()=>{await Promise.all([worker(),worker(),worker()]);fs.writeFileSync(cacheFile,JSON.stringify(cache,null,2));
const records={};
for(const row of rows){const spec=lookup(row),q=spec.q,r=cache[JSON.stringify(spec)],pos=r?.coordinates;const words=terms(r?.name),input=terms(q);const similarity=words.length?words.filter(t=>input.includes(t)).length/words.length:0;
const accepted=pos&&r.score>=.5&&(r.type==='municipality'||similarity>=.65)&&(!spec.aix||r.citycode==='13001')&&pos[1]>42.9&&pos[1]<44.2&&pos[0]>4.5&&pos[0]<6.4;
records[row.id]=accepted?{lat:pos[1],lng:pos[0],label:r.label,precision:r.type,score:r.score,query:q}:{reason:q?'Adresse à préciser ou correspondance insuffisante':'Adresse non renseignée',query:q};}
fs.writeFileSync(path.join(root,'map-data.js'),'window.CLUB_GEO = '+JSON.stringify({provider:'IGN Géoplateforme / BAN',date:new Date().toISOString().slice(0,10),records},null,2)+';\n');
const values=Object.values(records);console.log(JSON.stringify({total:values.length,located:values.filter(x=>x.lat).length,precision:values.reduce((a,x)=>(a[x.precision||'unresolved']=(a[x.precision||'unresolved']||0)+1,a),{})}));})();
