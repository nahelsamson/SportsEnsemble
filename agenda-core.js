(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AgendaCore=api;})(typeof window!=='undefined'?window:this,()=>{
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function ageMatch(text,age){
  const s=fold(text).replace(/[–—]/g,'-');
  if(!s||/non communique|estime|cible|environ|env\.|≈|selon|contacter/.test(s))return 'unknown';
  if(/tout public|tous ages/.test(s))return 'match';
  // Only an unambiguous single age rule is used to exclude a club.
  if(/[;]|\bou\b|ans.*ans/.test(s))return 'unknown';
  let m=s.match(/^(?:enfants?\s*)?(?:de\s*)?(\d{1,2})\s*(?:-|a)\s*(\d{1,3})\s*ans\s*$/);
  if(m)return age>=+m[1]&&age<=+m[2]?'match':'excluded';
  m=s.match(/^(?:(?:enfants?|adultes?|ados?)\s*)?(?:des|a partir de)\s*(\d{1,3})\s*ans\s*$/);
  if(m)return age>=+m[1]?'match':'excluded';
  m=s.match(/^(\d{1,3})\s*ans\s*(?:et plus|et \+|\+)\s*$/);
  if(m)return age>=+m[1]?'match':'excluded';
  if(/^adultes?\s*$/.test(s))return age>=18?'match':'excluded';
  return 'unknown';
 }
 function validate(data,clubs){
  if(!Number.isInteger(data.age)||data.age<1||data.age>120)throw Error('Indique un âge entier entre 1 et 120 ans.');
  const sports=new Set(clubs.map(x=>x.discipline)),ids=new Set(clubs.map(x=>x.id));
  if(!Array.isArray(data.sports)||data.sports.length>80||!data.sports.every(s=>typeof s==='string'&&sports.has(s)))throw Error('La sélection de sports est invalide.');
  if(!Array.isArray(data.selectedIds)||data.selectedIds.length>100||!data.selectedIds.every(s=>typeof s==='string'&&ids.has(s)))throw Error('La sélection de clubs est invalide.');
  return {age:data.age,sports:[...new Set(data.sports)],selectedIds:[...new Set(data.selectedIds)]};
 }
 const address=x=>Object.entries(x.fields).find(([k])=>k.startsWith('Adresse'))?.[1]||'';
 const directions=x=>address(x)?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address(x)):'';
 return {fold,ageMatch,validate,address,directions};
});
