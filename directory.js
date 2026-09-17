'use strict';
window.Directory = (() => {
  const E = AixCore.escape, all = window.CLUB_DIRECTORY;
  const state = { q: '', kind: 'club', discipline: '', page: 1 };
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function website(value) {
    value = String(value || '').trim();
    if (!/^https?:\/\//i.test(value)) {
      if (!/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?$/i.test(value)) return '';
      value = 'https://' + value;
    }
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
  }
  function entries(local) {
    return [...all, ...local.filter(x => x.type === 'club' && x.status === 'published').map(x => ({
      id: x.id, name: x.title, discipline: x.sport, kind: 'club', category: 'Ajout dans ce navigateur',
      fields: { Description: x.body, Adresse: x.venue }, image: x.image || 'assets/clubs/venue.svg', local: true
    }))];
  }
  // Relative asset URLs work both at localhost / and GitHub Pages /SportsEnsemble/.
  const imageUrl = value => String(value || 'assets/clubs/venue.svg').replace(/^\/(?=assets\/clubs\/)/, '');
  const address = x => Object.entries(x.fields).find(([k]) => k.startsWith('Adresse'))?.[1] || '';
  const closed = x => /ferm[ée]|fermeture/i.test(Object.values(x.fields).join(' '));
  const href = x => '#' + (x.local ? 'contenu/' : 'club/') + encodeURIComponent(x.id);
  function card(x) {
    return '<article class="card directory-card"><a href="' + href(x) + '" tabindex="-1" aria-hidden="true"><img loading="lazy" width="600" height="300" class="directory-image ' + (x.imageSource ? 'club-logo' : '') + '" src="' + E(imageUrl(x.image)) + '" alt=""></a><div class="card-body"><div class="info-line"><span class="tag">' + E(x.discipline) + '</span>' + (closed(x) ? '<span class="tag closure">Fermeture mentionnée</span>' : '') + '</div><h3><a href="' + href(x) + '">' + E(x.name) + '</a></h3><p class="muted">' + E(address(x) || 'Adresse non renseignée') + '</p><a class="text-link" href="' + href(x) + '">Voir la fiche ↗</a></div></article>';
  }
  function results(local) {
    const tokens = fold(state.q).split(/\s+/).filter(Boolean);
    return entries(local).filter(x => (!state.kind || x.kind === state.kind) && (!state.discipline || x.discipline === state.discipline) && tokens.every(t => fold(x.name + ' ' + x.discipline + ' ' + Object.values(x.fields).join(' ')).includes(t))).sort((a,b) => a.name.localeCompare(b.name, 'fr'));
  }
  function render(local) {
    const disciplines = [...new Set(entries(local).filter(x => !state.kind || x.kind === state.kind).map(x => x.discipline))].sort((a,b) => a.localeCompare(b,'fr'));
    return '<div class="container directory"><section class="directory-intro"><span class="badge">LE PAYS D’AIX EN MOUVEMENT</span><h1>Trouvez votre prochain <br>terrain de jeu.</h1><p>Un club, une discipline, un lieu pour bouger près de chez vous.</p><div class="directory-stats"><span><strong>379</strong> fiches de clubs</span><span><strong>167</strong> lieux & équipements</span></div></section><form id="directory-filters" class="directory-filters" role="search"><div><label for="directory-query">Un nom, une adresse, une activité</label><input id="directory-query" type="search" placeholder="Ex. rugby, Puyricard, yoga…" value="' + E(state.q) + '"></div><div><label for="directory-kind">Je recherche</label><select id="directory-kind">' + [['club','Clubs et structures privées'],['lieu','Lieux et équipements'],['','Tout l’annuaire']].map(([v,l])=>'<option value="'+v+'" '+(state.kind===v?'selected':'')+'>'+l+'</option>').join('') + '</select></div><div><label for="directory-discipline">Discipline ou type de lieu</label><select id="directory-discipline"><option value="">Toutes les disciplines</option>' + disciplines.map(d=>'<option '+(state.discipline===d?'selected':'')+'>'+E(d)+'</option>').join('') + '</select></div><button type="reset" class="ghost">Réinitialiser</button></form><p class="small muted">Informations issues du fichier fourni : horaires, tarifs et disponibilités à confirmer auprès des structures. Une structure peut avoir plusieurs fiches selon ses activités.</p><div id="directory-results"></div></div>';
  }
  function update(local, focus = false) {
    const found = results(local), pages = Math.max(1,Math.ceil(found.length/18));
    state.page = Math.min(state.page,pages);
    const target = document.getElementById('directory-results');
    if (!target) return;
    target.innerHTML = '<p role="status" aria-live="polite" class="directory-count">' + found.length + ' fiche' + (found.length > 1 ? 's' : '') + ' trouvée' + (found.length > 1 ? 's' : '') + '</p><div class="grid">' + (found.slice((state.page-1)*18,state.page*18).map(card).join('') || '<div class="empty"><h2>Aucun résultat</h2><p>Essayez un autre nom ou retirez un filtre.</p></div>') + '</div><div class="directory-pagination"><button class="ghost" data-dir-page="-1" '+(state.page===1?'disabled':'')+'>← Précédent</button><span>Page '+state.page+' sur '+pages+'</span><button class="ghost" data-dir-page="1" '+(state.page===pages?'disabled':'')+'>Suivant →</button></div>';
    target.querySelectorAll('[data-dir-page]').forEach(b => b.onclick = () => {state.page+=Number(b.dataset.dirPage);update(local,true)});
    if(focus){target.querySelector('.directory-count').tabIndex=-1;target.querySelector('.directory-count').focus();target.scrollIntoView({block:'start'})}
  }
  function bind(local) {
    const form = document.getElementById('directory-filters'); if(!form)return;
    update(local);
    form.onsubmit = e => e.preventDefault();
    document.getElementById('directory-query').oninput = e => {state.q=e.target.value;state.page=1;update(local)};
    document.getElementById('directory-kind').onchange = e => {state.kind=e.target.value;state.discipline='';state.page=1;route();document.getElementById('directory-kind').focus()};
    document.getElementById('directory-discipline').onchange = e => {state.discipline=e.target.value;state.page=1;update(local)};
    form.onreset = e => {e.preventDefault();Object.assign(state,{q:'',kind:'club',discipline:'',page:1});route();document.getElementById('directory-query').focus()};
  }
  function detail(id) {
    const x = all.find(x=>x.id===id);if(!x)return '<div class="container"><h1>Fiche introuvable</h1><a href="#clubs">Retour à l’annuaire</a></div>';
    const links=[];
    Object.entries(x.fields).forEach(([key,value])=>{
      if(/site web/i.test(key)){const u=website(value);if(u)links.push('<a class="button" target="_blank" rel="noopener noreferrer" href="'+E(u)+'">Site du club ↗</a>')}
      if(key==='Email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))links.push('<a class="button ghost" href="mailto:'+E(encodeURIComponent(value))+'">Envoyer un e-mail</a>');
      if(key==='Téléphone')value.split(/\s*\/\s*/).forEach(p=>{const number=p.replace(/[ .()-]/g,'');if(/^\+?\d{10,15}$/.test(number))links.push('<a class="button ghost" href="tel:'+E(number)+'">Appeler '+E(p)+'</a>')});
    });
    if(address(x))links.push('<a class="button ghost" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(address(x))+'">Voir sur la carte ↗</a>');
    return '<article class="container directory-detail"><a class="back" href="#clubs">← Retour à l’annuaire</a><div class="info-line"><span class="tag">'+E(x.discipline)+'</span><span>'+E(x.kind==='club'?'Club / structure':'Lieu / équipement')+'</span></div><h1>'+E(x.name)+'</h1><div class="directory-detail-layout"><div><img class="directory-image '+(x.imageSource?'club-logo':'')+'" src="'+E(imageUrl(x.image))+'" alt="'+E(x.imageSource?'Logo de '+x.name:'Illustration : '+x.discipline)+'"><p class="small muted">'+E(x.imageCredit)+(x.imageSource?' · <a class="text-link" target="_blank" rel="noopener noreferrer" href="'+E(x.imageSource)+'">Source du logo ↗</a>':'')+'</p><div class="actions">'+links.join('')+'</div></div><div class="panel">'+(closed(x)?'<div class="notice closure">Le fichier mentionne une fermeture. Consultez les détails et contactez la structure avant de vous déplacer.</div>':'')+'<h2>Informations pratiques</h2><dl class="directory-fields">'+Object.entries(x.fields).filter(([k])=>!['Discipline','Nom','Nom du club','Nom du spot','Nom du parc','Nom du site','Nom du stade','Nom du gymnase','Site'].includes(k)).map(([k,v])=>'<div><dt>'+E(k)+'</dt><dd>'+E(v)+'</dd></div>').join('')+'</dl></div></div><p class="small muted directory-source">Source : classeur fourni, onglet « '+E(x.category)+' », ligne '+x.sourceRow+'. Importé le 15 septembre 2026. Informations non revérifiées individuellement ; estimations et réserves du fichier conservées.</p></article>';
  }
  return {render,bind,detail,website,results,state};
})();
