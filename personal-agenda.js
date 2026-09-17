'use strict';
window.PersonalAgenda = (() => {
 const E=AixCore.escape,A=AgendaCore,clubs=CLUB_DIRECTORY.filter(x=>x.kind==='club');
 let search='',limit=18;
 const prefs=()=>Auth.user?.agenda||{age:null,sports:[],selectedIds:[]};
 const complete=x=>['Horaires','Tarif'].filter(k=>x.fields[k]&&!/non communiqu|non renseign/i.test(x.fields[k])).length;
 const audience=x=>x.fields['Âge / Public']||'Âge non renseigné';
 function card(x,p,selected){
  const verdict=A.ageMatch(audience(x),p.age);
  const price=x.fields.Tarif||'Tarif non renseigné',hours=x.fields.Horaires||'Horaires non renseignés';
  return '<article class="panel agenda-club"><div class="info-line"><span class="tag">'+E(x.discipline)+'</span><span class="tag">'+(verdict==='match'?'Âge compatible selon le fichier':verdict==='excluded'?'Âge hors de la plage indiquée':'Âge à confirmer auprès du club')+'</span></div><h3><a href="#club/'+encodeURIComponent(x.id)+'">'+E(x.name)+'</a></h3><dl><dt>Public accueilli</dt><dd>'+E(audience(x))+'</dd><dt>Horaires proposés par le club</dt><dd>'+E(hours)+'</dd><dt>Prix indiqué</dt><dd>'+E(price)+'</dd><dt>Adresse</dt><dd>'+E(A.address(x)||'Adresse non renseignée')+'</dd></dl><div class="actions"><button data-agenda-id="'+E(x.id)+'" class="'+(selected?'ghost':'')+'">'+(selected?'Retirer de mon agenda':'Ajouter à mon agenda')+'</button>'+(A.directions(x)?'<a class="button ghost" target="_blank" rel="noopener noreferrer" href="'+E(A.directions(x))+'">Itinéraire Google Maps ↗</a>':'')+'<a class="text-link" href="#club/'+encodeURIComponent(x.id)+'">Fiche du club ↗</a></div></article>';
 }
 function render(){
  if(!Auth.user)return '<section class="container auth-container"><div class="panel"><span class="badge">MON AGENDA SPORTIF</span><h1>Un agenda à ton rythme.</h1><p>Connecte-toi pour enregistrer ton âge, choisir tes sports et retrouver tes clubs, horaires et tarifs.</p><div class="actions"><a class="button" href="#connexion">Me connecter</a><a class="button ghost" href="#inscription">Créer mon compte</a></div></div></section>';
  const p=prefs(),sports=[...new Set(clubs.map(x=>x.discipline))].sort((a,b)=>a.localeCompare(b,'fr'));
  return '<section class="container personal-agenda"><span class="eyebrow">MES SPORTS · MES HORAIRES</span><h1>L’agenda de '+E(Auth.user.name)+'</h1><a class="button ghost" href="#semaine">Organiser ma semaine ↗</a><p class="muted">Choisis tes sports et conserve les clubs qui te plaisent dans ton compte.</p><details class="panel agenda-settings" '+(!p.age?'open':'')+'><summary>Mon âge et mes sports'+(p.age?' · '+p.age+' ans · '+p.sports.length+' sport(s)':'')+'</summary><form id="agenda-preferences"><div class="field agenda-age"><label for="agenda-age">Mon âge</label><input id="agenda-age" name="age" type="number" min="1" max="120" step="1" required value="'+E(p.age||'')+'"><small class="muted">Tu peux le modifier à tout moment.</small></div><fieldset><legend>Les sports qui m’intéressent</legend><div class="agenda-sports">'+sports.map(s=>'<label><input type="checkbox" name="sports" value="'+E(s)+'" '+(p.sports.includes(s)?'checked':'')+'><span>'+E(s)+'</span></label>').join('')+'</div></fieldset><button type="submit">Enregistrer mes préférences</button></form></details><p id="agenda-message" role="status" aria-live="polite"></p><div class="notice">Les horaires et tarifs proviennent du fichier des clubs. Ils ne sont pas toujours détaillés par âge : les cas incertains sont signalés et restent à confirmer auprès du club. Ajouter un club ici ne réserve pas de cours.</div><div id="agenda-content"></div></section>';
 }
 function update(){
  const target=document.getElementById('agenda-content');if(!target)return;
  const p=prefs(),selected=clubs.filter(x=>p.selectedIds.includes(x.id));
  if(!p.age){target.innerHTML='<div class="empty"><h2>Commence par choisir tes sports</h2><p>Renseigne ton âge et enregistre tes préférences ci-dessus.</p></div>';return}
  const candidates=clubs.filter(x=>p.sports.includes(x.discipline)&&!p.selectedIds.includes(x.id)&&A.ageMatch(audience(x),p.age)!=='excluded'&&A.fold(x.name+' '+A.address(x)).includes(A.fold(search))).sort((a,b)=>(A.ageMatch(audience(a),p.age)==='match'?0:1)-(A.ageMatch(audience(b),p.age)==='match'?0:1)||complete(b)-complete(a)||a.name.localeCompare(b.name,'fr'));
  target.innerHTML='<h2>Mon agenda · '+selected.length+' club(s)</h2><div class="agenda-grid">'+(selected.map(x=>card(x,p,true)).join('')||'<p class="muted">Ajoute un club parmi les propositions pour retrouver ici ses horaires, son prix et ton itinéraire.</p>')+'</div><div class="section-title"><h2>Des clubs pour mes sports</h2></div><label for="agenda-search">Rechercher un club ou une adresse</label><input id="agenda-search" type="search" value="'+E(search)+'" placeholder="Un club, un quartier…"><p class="small muted">'+candidates.length+' proposition(s). Les plages d’âge clairement incompatibles sont masquées ; les publics non précisés restent à confirmer.</p><div class="agenda-grid">'+candidates.slice(0,limit).map(x=>card(x,p,false)).join('')+'</div>'+(!candidates.length?'<p>Aucune proposition. Modifie tes sports ou ta recherche.</p>':'')+(candidates.length>limit?'<button id="agenda-more" class="ghost">Voir davantage de clubs</button>':'');
  document.getElementById('agenda-search').oninput=e=>{search=e.target.value;const pos=e.target.selectionStart;limit=18;update();const input=document.getElementById('agenda-search');input.focus();input.setSelectionRange(pos,pos)};
  const more=document.getElementById('agenda-more');if(more)more.onclick=()=>{limit+=18;update()};
  document.querySelectorAll('[data-agenda-id]').forEach(button=>button.onclick=async()=>{
   const p=prefs(),id=button.dataset.agendaId;const next={...p,selectedIds:p.selectedIds.includes(id)?p.selectedIds.filter(x=>x!==id):[...p.selectedIds,id]};
   await save(next);
  });
 }
 let saving=false;
 async function save(next){
  if(saving)return;saving=true;const currentId=Auth.user?.id;
  const message=document.getElementById('agenda-message');message.textContent='Enregistrement…';
  document.querySelectorAll('.personal-agenda button').forEach(b=>b.disabled=true);
  try{const result=await Auth.request('agenda',next);if(Auth.user?.id!==currentId)return;Auth.user=result.user;if(location.hash==='#agenda'){route();document.getElementById('agenda-message').textContent='Ton agenda est enregistré dans ton compte.'}}
  catch(e){if(message.isConnected){message.textContent=e.message;message.className='error'}}
  finally{saving=false;document.querySelectorAll('.personal-agenda button').forEach(b=>b.disabled=false)}
 }
 function bind(){
  const form=document.getElementById('agenda-preferences');if(!form)return;
  update();form.onsubmit=async e=>{e.preventDefault();const data=new FormData(form);try{await save(A.validate({age:Number(data.get('age')),sports:data.getAll('sports'),selectedIds:prefs().selectedIds},clubs))}catch(error){document.getElementById('agenda-message').textContent=error.message}};
 }
 return {render,bind};
})();
