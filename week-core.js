(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WeekCore=api;})(typeof window!=='undefined'?window:this,()=>{
 const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function minutes(s){if(!/^\d{2}:\d{2}$/.test(s))return NaN;const [h,m]=s.split(':').map(Number);return h<=24&&m<60&&(h<24||m===0)?h*60+m:NaN}
 const time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 function proposals(club,age){
  const raw=club.fields.Horaires||'',s=fold(raw).replace(/[–—]/g,'-'),out=[];
  // A day and both endpoints must be present in the same clause.
  for(const clause of s.split(/[,;\n]/)){
   const interval=clause.match(/\b(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/);
   if(!interval)continue;
   const start=+interval[1]*60+(+interval[2]||0),end=+interval[3]*60+(+interval[4]||0);
   if(start>=end||end>1440)continue;
   let ds=[];
   if(/tous les jours|7j\s*\/\s*7/.test(clause))ds=[0,1,2,3,4,5,6];
   else {for(let i=0;i<7;i++)if(new RegExp('\\b'+['lun(?:di)?','mar(?:di)?','mer(?:credi)?','jeu(?:di)?','ven(?:dredi)?','sam(?:edi)?','dim(?:anche)?'][i]+'\\b').test(clause))ds.push(i);}
   // Do not expand ambiguous "lun-ven" or "du lundi au vendredi".
   if(ds.length>1&&/(?:lun\w*|mar\w*|mer\w*|jeu\w*|ven\w*|sam\w*|dim\w*)\.?\s*(?:-|au|a)\s*(?:lun|mar|mer|jeu|ven|sam|dim)/.test(clause))continue;
   for(const day of ds){const key=day+'-'+start+'-'+end;if(!out.some(x=>x.key===key)){const ages=clause.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*ans/);out.push({key,day,start,end,label:clause.trim(),...(ages?{minAge:+ages[1],maxAge:+ages[2]}:/\badultes?\b/.test(clause)&&!/enfant|ado/.test(clause)?{minAge:18,maxAge:120}:{})});}}
  }return out.filter(x=>!Number.isInteger(age)||x.minAge===undefined||(age>=x.minAge&&age<=x.maxAge));
 }
 const overlap=(a,b)=>a.day===b.day&&a.start<b.end&&b.start<a.end;
 function validate(data,clubs,age,context={}){
  if(!Array.isArray(data)||data.length>80)throw Error('Le planning peut contenir au maximum 80 séances.');
  const ids=new Set(),next=data.map(x=>{
   if(!x||typeof x.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(x.id)||ids.has(x.id))throw Error('Identifiant de séance invalide.');
   ids.add(x.id);const club=clubs.find(c=>c.id===x.clubId);if(!club)throw Error('Club introuvable.');
   if(!Number.isInteger(x.day)||x.day<0||x.day>6||!Number.isInteger(x.start)||!Number.isInteger(x.end)||x.start<0||x.end>1440||x.end<=x.start)throw Error('Indique un jour et une heure de fin après le début.');
   const old=context.previous?.find(p=>p.id===x.id);
   const unchanged=old&&['clubId','day','start','end','source','proposalKey','confirmed'].every(k=>old[k]===x[k]);
   if(!unchanged){
    if(context.selectedIds&&!context.selectedIds.includes(x.clubId))throw Error('Ajoute d’abord ce club à ton agenda avant de planifier une séance.');
    if(proposals(club).length){
     const p=proposals(club,age).find(p=>p.key===x.proposalKey);
     if(x.source!=='proposal'||!p||p.day!==x.day||x.start!==p.start||x.end!==p.end)throw Error('Choisis exactement un horaire proposé par ce club pour ton âge.');
    }else if(x.source!=='confirmed'||x.confirmed!==true)throw Error('Confirme ce créneau auprès du club avant de l’ajouter.');
   }
   return {id:x.id,clubId:x.clubId,day:x.day,start:x.start,end:x.end,source:x.source,...(x.source==='proposal'?{proposalKey:x.proposalKey}:{confirmed:true})};
  });
  for(let i=0;i<next.length;i++)for(let j=0;j<i;j++)if(overlap(next[i],next[j])){const c=clubs.find(c=>c.id===next[j].clubId);throw Error('Chevauchement avec '+c.name+' : '+days[next[j].day]+' '+time(next[j].start)+'–'+time(next[j].end)+'. Choisis un autre créneau.');}
  return next;
 }
 const eligible=(clubs,agenda)=>clubs.filter(c=>agenda?.selectedIds?.includes(c.id));
 return {days,time,minutes,proposals,overlap,validate,eligible};
});
