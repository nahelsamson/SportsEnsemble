'use strict';
window.WeeklyPlanner=(()=>{
 const E=AixCore.escape,W=WeekCore,A=AgendaCore,clubs=CLUB_DIRECTORY.filter(x=>x.kind==='club');
 let offset=0,busy=false,chosen='',picked='',notice='';
 const plan=()=>Auth.user?.weeklyPlan||{revision:0,sessions:[]};
 function monday(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7+offset*7);return d}
 function grid(){
  const sessions=plan().sessions,start=Math.min(7,...sessions.map(x=>Math.floor(x.start/60))),end=Math.max(23,...sessions.map(x=>Math.ceil(x.end/60)));
  const base=monday(),today=new Date().toDateString();
  return '<div class="week-scroll" tabindex="0" aria-label="Planning de la semaine, défilement horizontal sur petit écran"><div class="week-board"><div class="week-corner">Heure</div>'+W.days.map((day,i)=>{const d=new Date(base);d.setDate(d.getDate()+i);return '<div class="week-day '+(d.toDateString()===today?'is-today':'')+'">'+day.slice(0,3)+'. <span>'+d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+'</span></div>'}).join('')+'<div class="week-hours" style="height:'+((end-start)*60)+'px">'+Array.from({length:end-start},(_,i)=>'<span style="top:'+(i*60)+'px">'+W.time((start+i)*60)+'</span>').join('')+'</div>'+W.days.map((day,i)=>'<div class="week-column" style="height:'+((end-start)*60)+'px" aria-label="'+day+'">'+sessions.filter(x=>x.day===i).map(s=>{const c=clubs.find(c=>c.id===s.clubId);return '<button class="week-session color-'+(clubs.indexOf(c)%5)+'" style="top:'+(s.start-start*60)+'px;height:'+(s.end-s.start)+'px" data-session="'+E(s.id)+'" title="'+E(c.name)+' · '+W.time(s.start)+'–'+W.time(s.end)+'"><strong>'+W.time(s.start)+'–'+W.time(s.end)+'</strong><span>'+E(c.discipline)+'</span><small>'+E(c.name)+'</small></button>'}).join('')+'</div>').join('')+'</div></div>';
 }
 function render(){
  if(!Auth.user)return '<div class="container"><h1>Ma semaine sportive</h1><p>Connecte-toi pour organiser tes séances sans chevauchement.</p><a class="button" href="#connexion">Me connecter</a></div>';
  const prefs=Auth.user.agenda,eligible=W.eligible(clubs,prefs);
  if(!eligible.some(x=>x.id===chosen))chosen=eligible[0]?.id||'';
  const selected=clubs.find(c=>c.id===chosen),p=plan(),m=monday(),sun=new Date(m);sun.setDate(sun.getDate()+6);
  return '<section class="container weekly-page"><div class="section-title"><div><span class="eyebrow">MES RENDEZ-VOUS SPORTIFS</span><h1>Ma semaine</h1><p class="muted">Une semaine type, enregistrée dans ton compte. Les séances se répètent chaque semaine, à l’heure locale.</p></div><div class="actions"><button id="week-add-shortcut">+ Ajouter une séance</button><a class="button ghost" href="#agenda">Choisir mes sports ↗</a></div></div><div class="week-toolbar"><button id="week-prev" class="ghost" aria-label="Semaine précédente">←</button><strong>'+m.toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+' – '+sun.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})+'</strong><button id="week-next" class="ghost" aria-label="Semaine suivante">→</button><button id="week-today" class="ghost">Cette semaine</button><span class="tag">'+p.sessions.length+' séance(s) · '+(p.sessions.reduce((n,x)=>n+x.end-x.start,0)/60).toLocaleString('fr-FR',{maximumFractionDigits:1})+' h / semaine</span></div>'+grid()+'<p class="small muted">Clique sur une séance pour voir son adresse, son tarif ou la retirer. Le contrôle porte sur les horaires ; prévois aussi le temps de trajet.</p><p id="week-message" role="status" aria-live="polite">'+E(notice)+'</p><div id="week-detail"></div><div class="panel week-add"><h2>Ajouter une séance</h2>'+(!eligible.length?'<p>Ajoute d’abord un club avec « Ajouter à mon agenda ». Seuls les clubs ainsi sélectionnés apparaissent ici.</p><a class="button" href="#agenda">Configurer mon agenda</a>':'<form id="week-form"><div class="field"><label for="week-club">Club sélectionné dans mon agenda</label><select id="week-club">'+eligible.sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(x=>'<option value="'+E(x.id)+'" '+(chosen===x.id?'selected':'')+'>'+E(x.discipline+' · '+x.name)+'</option>').join('')+'</select></div><div id="week-source"></div><div id="week-custom" class="fields"><div class="field"><label for="week-day">Jour</label><select id="week-day">'+W.days.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join('')+'</select></div><div class="field"><label for="week-start">Début</label><input id="week-start" type="time" required value="18:00"></div><div class="field"><label for="week-end">Fin</label><input id="week-end" type="time" required value="19:00"></div></div><label class="week-confirm"><input type="checkbox" id="week-confirm" required> J’ai vérifié que ce créneau correspond à mon cours et à mon âge auprès du club.</label><p class="small muted">Une plage d’ouverture ne garantit pas un cours disponible. Ce planning ne constitue pas une réservation.</p><button type="submit">Ajouter à ma semaine</button><p id="week-error" class="error" role="alert"></p></form>')+'</div></section>';
 }
 function source(){
  const c=clubs.find(x=>x.id===chosen),el=document.getElementById('week-source');if(!el||!c)return;
  const known=W.proposals(c).length>0,options=W.proposals(c,Auth.user.agenda?.age);picked='';
  el.innerHTML='<p class="week-source-text"><strong>Horaires indiqués par le club</strong><br>'+E(c.fields.Horaires||'Non renseignés')+'</p><p class="small muted">Public : '+E(c.fields['Âge / Public']||'À confirmer')+'<br>Tarif : '+E(c.fields.Tarif||'À confirmer')+'</p>'+(known?'<div class="field"><label for="week-proposal">Horaire du club</label><select id="week-proposal" required><option value="">Choisir un horaire…</option>'+options.map(x=>'<option value="'+x.key+'">'+E(W.days[x.day]+' '+W.time(x.start)+'–'+W.time(x.end)+' · '+x.label)+'</option>').join('')+'</select></div><p class="small muted">'+(options.length?'Le jour et les heures sont fixés par ce créneau.':'Aucun des créneaux indiqués ne correspond à ton âge. Consulte le club pour connaître les autres possibilités.')+'</p>':'<p class="small muted">Aucun créneau complet (jour, début et fin) n’est renseigné dans le fichier. Tu peux saisir un horaire confirmé auprès du club.</p>');
  document.getElementById('week-confirm').checked=false;
  document.getElementById('week-custom').hidden=known;
  for(const id of ['week-day','week-start','week-end'])document.getElementById(id).disabled=known;
  if(!known){document.getElementById('week-day').value='0';document.getElementById('week-start').value='';document.getElementById('week-end').value='';}
  const select=document.getElementById('week-proposal');if(select)select.onchange=e=>{picked=e.target.value;document.getElementById('week-confirm').checked=false;document.getElementById('week-error').textContent='';};
 }
 async function save(sessions){
  if(busy)return;busy=true;const id=Auth.user.id;
  document.querySelectorAll('.weekly-page button').forEach(x=>x.disabled=true);
  try{const result=await Auth.request('week',{revision:plan().revision,sessions});if(Auth.user?.id!==id)return;Auth.user=result.user;notice='Ta semaine est enregistrée.';if(location.hash==='#semaine')route();}
  catch(error){const box=document.getElementById('week-error')||document.getElementById('week-message');if(box)box.textContent=error.message}
  finally{busy=false;document.querySelectorAll('.weekly-page button').forEach(x=>x.disabled=false)}
 }
 function detail(id){
  const s=plan().sessions.find(x=>x.id===id);if(!s)return;
  const c=clubs.find(x=>x.id===s.clubId),el=document.getElementById('week-detail');
  el.innerHTML='<article class="panel week-detail"><span class="tag">'+W.days[s.day]+' · '+W.time(s.start)+'–'+W.time(s.end)+'</span><h2>'+E(c.name)+'</h2><p>'+E(c.discipline)+' · '+(s.source==='proposal'?'Plage issue du fichier, choisie par toi':'Créneau renseigné et confirmé par toi')+'</p><p>'+E(A.address(c)||'Adresse à confirmer')+'</p><p>Tarif indiqué : '+E(c.fields.Tarif||'À confirmer')+'</p><div class="actions">'+(A.directions(c)?'<a class="button ghost" target="_blank" rel="noopener noreferrer" href="'+E(A.directions(c))+'">Itinéraire Google Maps ↗</a>':'')+'<a class="button ghost" href="#club/'+encodeURIComponent(c.id)+'">Fiche du club</a><button id="week-remove" class="danger">Retirer cette séance</button><button id="week-close" class="ghost">Fermer</button></div></article>';
  document.getElementById('week-remove').onclick=()=>save(plan().sessions.filter(x=>x.id!==id));
  document.getElementById('week-close').onclick=()=>el.innerHTML='';
  el.scrollIntoView({behavior:'smooth',block:'center'});
 }
 function bind(){
  if(!document.getElementById('week-today'))return;
  document.getElementById('week-add-shortcut').onclick=()=>document.querySelector('.week-add').scrollIntoView({behavior:'smooth',block:'start'});
  const sessions=plan().sessions;if(sessions.length){const min=Math.min(...sessions.map(x=>x.start));document.querySelector('.week-scroll').scrollTop=Math.max(0,min-Math.min(7,Math.floor(min/60))*60-90);}
  document.getElementById('week-prev').onclick=()=>{offset--;route()};
  document.getElementById('week-next').onclick=()=>{offset++;route()};
  document.getElementById('week-today').onclick=()=>{offset=0;route()};
  document.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>detail(b.dataset.session));
  const f=document.getElementById('week-form');if(!f)return;
  source();document.getElementById('week-club').onchange=e=>{chosen=e.target.value;source()};
  f.onsubmit=e=>{
   e.preventDefault();const error=document.getElementById('week-error');error.textContent='';
   const club=clubs.find(x=>x.id===chosen),proposal=W.proposals(club,Auth.user.agenda?.age).find(x=>x.key===picked);
   const s={id:crypto.randomUUID(),clubId:chosen,day:proposal?proposal.day:Number(document.getElementById('week-day').value),start:proposal?proposal.start:W.minutes(document.getElementById('week-start').value),end:proposal?proposal.end:W.minutes(document.getElementById('week-end').value),source:proposal?'proposal':'confirmed',...(proposal?{proposalKey:proposal.key}:{confirmed:document.getElementById('week-confirm').checked})};
   try{save(W.validate([...plan().sessions,s],clubs,Auth.user.agenda?.age,{selectedIds:Auth.user.agenda?.selectedIds||[],previous:plan().sessions}));}catch(failure){error.textContent=failure.message}
  };
 }
 return {render,bind};
})();
