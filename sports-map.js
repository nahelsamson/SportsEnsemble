'use strict';
window.SportMap = (() => {
  const E = AixCore.escape, center = [43.5297, 5.4474];
  const state = { query: '', kind: '', category: '', discipline: '', limit: 40 };
  let map, layer, pins = new Map(), rows = [];
  const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const address = x => Object.entries(x.fields).find(([k]) => k.startsWith('Adresse'))?.[1] || '';
  const key = geo => geo.lat.toFixed(5) + ',' + geo.lng.toFixed(5);
  const valid = g => g && Number.isFinite(g.lat) && Number.isFinite(g.lng) && Math.abs(g.lat) <= 90 && Math.abs(g.lng) <= 180;
  const precision = g => g?.precision === 'poi' ? 'Équipement identifié · position indicative' : g?.precision === 'housenumber' ? 'Adresse localisée' : g?.precision === 'municipality' ? 'Commune uniquement · position approximative' : 'Rue ou secteur · position approximative';
  function entries(local = []) {
    return [...CLUB_DIRECTORY.map(x => ({...x, geo: CLUB_GEO.records[x.id]})), ...local.filter(x => x.type === 'club' && x.status === 'published').map(x => ({
      id:x.id, name:x.title, discipline:x.sport, category:'Ajout dans ce navigateur', kind:'club', local:true,
      image:x.image, fields:{Adresse:x.venue,Description:x.body},
      geo: CLUB_DIRECTORY.map(c=>({address:fold(address(c)),geo:CLUB_GEO.records[c.id]})).find(c=>c.address&&c.address===fold(x.venue))?.geo
    }))];
  }
  function filter(source, options = state) {
    const tokens = fold(options.query).split(/\s+/).filter(Boolean);
    return source.filter(x => (!options.kind || x.kind === options.kind) && (!options.category || x.category === options.category) && (!options.discipline || x.discipline === options.discipline) && tokens.every(t => fold([x.name,x.discipline,address(x),x.fields['Secteur / Lieu de pratique']||''].join(' ')).includes(t)));
  }
  function group(source) {
    const groups = new Map();
    for (const row of source) {if(!valid(row.geo))continue;const k=key(row.geo);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
    return groups;
  }
  const link = x => '#'+(x.local?'contenu/':'club/')+encodeURIComponent(x.id);
  function options(values,current,all){return '<option value="">'+all+'</option>'+[...new Set(values)].sort((a,b)=>a.localeCompare(b,'fr')).map(v=>'<option '+(v===current?'selected ':'')+'value="'+E(v)+'">'+E(v)+'</option>').join('')}
  function render(local) {
    rows=entries(local);
    return '<div class="container map-page"><div class="map-heading"><div><span class="eyebrow">AIX-EN-PROVENCE & ALENTOURS</span><h1>Le sport autour de vous.</h1><p class="muted">Explorez les clubs et les lieux sportifs, directement sur la carte.</p></div><a class="button ghost" href="#clubs">Voir l’annuaire ↗</a></div><div class="map-layout"><aside class="map-sidebar"><form id="map-filters" role="search"><label for="map-query">Rechercher un lieu</label><input id="map-query" type="search" placeholder="Nom, adresse ou sport…" value="'+E(state.query)+'"><label for="map-kind">Type de structure</label><select id="map-kind">'+options(['club','lieu'],state.kind,'Tous les types').replace('>club<','>Clubs et structures privées<').replace('>lieu<','>Lieux et équipements<')+'</select><label for="map-category">Catégorie</label><select id="map-category">'+options(rows.filter(x=>!state.kind||x.kind===state.kind).map(x=>x.category),state.category,'Toutes les catégories')+'</select><label for="map-discipline">Discipline / activité</label><select id="map-discipline">'+options(rows.filter(x=>(!state.kind||x.kind===state.kind)&&(!state.category||x.category===state.category)).map(x=>x.discipline),state.discipline,'Toutes les disciplines')+'</select><button type="reset" class="ghost">Effacer les filtres</button></form><div id="map-results"></div></aside><section class="map-stage" aria-label="Carte interactive des clubs"><div class="map-toolbar"><button id="map-aix" class="ghost">Recentrer sur Aix</button><button id="map-fit" class="ghost">Voir les résultats</button></div><div id="sports-map" aria-label="Carte des lieux sportifs" tabindex="0"></div><p id="map-tiles-error" class="notice" role="status" hidden>Le fond de carte est indisponible. Vérifiez votre connexion Internet ; les fiches et la recherche restent disponibles.</p><div class="map-legend"><span><i class="pin-dot"></i> Adresse</span><span><i class="pin-dot approximate"></i> Position approximative</span><span>Un nombre = plusieurs fiches au même endroit</span></div><p class="small muted">Les repères indiquent les adresses du classeur, parfois le siège du club. Vérifiez le lieu de pratique dans la fiche. Les adresses non localisées restent dans la liste.</p><p class="small muted">Positions : <a class="text-link" href="https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/" target="_blank" rel="noopener noreferrer">IGN / Base Adresse Nationale</a>. Fond de carte en ligne : OpenStreetMap.</p></section></div></div>';
  }
  function popup(source) {
    return '<div class="map-popup"><p class="eyebrow">'+source.length+' fiche'+(source.length>1?'s':'')+' à cet endroit</p>'+source.map(x=>'<article><strong>'+E(x.name)+'</strong><p>'+E(x.discipline)+(x.fields['Activité / Tranche d’âge']?' · '+E(x.fields['Activité / Tranche d’âge']):x.fields["Activité / Tranche d'âge"]?' · '+E(x.fields["Activité / Tranche d'âge"]):'')+'<br>'+E(address(x))+'</p><p class="map-precision">'+E(precision(x.geo))+'</p><p class="small">Adresse reconnue : '+E(x.geo.label||'')+'</p><a class="text-link" href="'+link(x)+'">Ouvrir la fiche ↗</a></article>').join('')+'</div>';
  }
  function fit() {
    const points=filter(rows).filter(x=>valid(x.geo)).map(x=>[x.geo.lat,x.geo.lng]);
    if(!map||!points.length)return;
    map.fitBounds(points,{padding:[35,35],maxZoom:15});
  }
  function update(reframe = false) {
    const found=filter(rows).sort((a,b)=>a.name.localeCompare(b.name,'fr')), groups=group(found);
    pins.clear();if(layer)layer.clearLayers();
    if(map)for(const [k,source] of groups){
      const g=source[0].geo,approx=source.some(x=>x.geo.precision!=='housenumber');
      const icon=L.divIcon({className:'sport-marker',html:'<span class="sport-pin '+(approx?'is-approximate':'')+'">'+(source.length>1?source.length:'')+'</span>',iconSize:[30,30],iconAnchor:[15,15]});
      const marker=L.marker([g.lat,g.lng],{icon,title:source.map(x=>x.name).join(', '),alt:source.length+' fiche(s), '+source[0].name,keyboard:true}).bindPopup(popup(source),{maxHeight:300,maxWidth:330,minWidth:235}).addTo(layer);
      pins.set(k,marker);
    }
    const located=found.filter(x=>valid(x.geo)).length;
    document.getElementById('map-results').innerHTML='<p class="map-count" role="status" aria-live="polite">'+found.length+' fiches · '+groups.size+' repère'+(groups.size>1?'s':'')+'<br><small>'+located+' fiches localisées'+(found.length-located?' · '+(found.length-located)+' à préciser':'')+'</small></p><div class="map-result-list">'+found.slice(0,state.limit).map(x=>'<article><span class="tag">'+E(x.discipline)+'</span><h2><a href="'+link(x)+'">'+E(x.name)+'</a></h2><p>'+E(address(x)||'Adresse non renseignée')+'</p>'+ (valid(x.geo)?'<button class="map-locate ghost" data-map-id="'+E(x.id)+'">Repérer sur la carte ↗</button><small>'+E(precision(x.geo))+'</small>':'<small>Adresse à préciser · <a class="text-link" href="'+link(x)+'">Voir la fiche</a></small>')+'</article>').join('')+(found.length?'':'<p>Aucun lieu ne correspond. Essayez un autre nom ou retirez un filtre.</p>')+'</div>'+(found.length>state.limit?'<button id="map-more" class="ghost">Afficher 40 fiches de plus</button>':'');
    document.querySelectorAll('[data-map-id]').forEach(b=>b.onclick=()=>{const x=found.find(x=>x.id===b.dataset.mapId);if(!map||!valid(x?.geo))return;const pin=pins.get(key(x.geo));map.setView([x.geo.lat,x.geo.lng],x.geo.precision==='municipality'?12:16);pin.openPopup();document.getElementById('sports-map').scrollIntoView({block:'center',behavior:'smooth'})});
    const more=document.getElementById('map-more');if(more)more.onclick=()=>{state.limit+=40;update()};
    const fitButton=document.getElementById('map-fit');if(fitButton)fitButton.disabled=!located;
    if(reframe)fit();
  }
  function bind(local) {
    if(!document.getElementById('sports-map'))return;
    rows=entries(local);
    if(typeof L==='undefined'){document.getElementById('map-tiles-error').hidden=false;}else{
    map=L.map('sports-map',{scrollWheelZoom:false}).setView(center,12);
    layer=L.layerGroup().addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>{const e=document.getElementById('map-tiles-error');if(e)e.hidden=false}).addTo(map);
    }
    document.getElementById('map-aix').onclick=()=>{if(map)map.setView(center,12)};
    document.getElementById('map-fit').onclick=fit;
    const form=document.getElementById('map-filters');
    form.onsubmit=e=>e.preventDefault();
    form.onreset=e=>{e.preventDefault();Object.assign(state,{query:'',kind:'',category:'',discipline:'',limit:40});route()};
    document.getElementById('map-query').oninput=e=>{state.query=e.target.value;state.limit=40;update(true)};
    for(const field of ['kind','category','discipline'])document.getElementById('map-'+field).onchange=e=>{
      state[field]=e.target.value;state.limit=40;
      if(field==='kind'){state.category='';state.discipline=''}
      if(field==='category')state.discipline='';
      document.getElementById('map-category').innerHTML=options(rows.filter(x=>!state.kind||x.kind===state.kind).map(x=>x.category),state.category,'Toutes les catégories');
      document.getElementById('map-discipline').innerHTML=options(rows.filter(x=>(!state.kind||x.kind===state.kind)&&(!state.category||x.category===state.category)).map(x=>x.discipline),state.discipline,'Toutes les disciplines');
      update(true);
    };
    update();
  }
  function destroy(){if(map){map.remove();map=null;}layer=null;pins.clear();}
  return {render,bind,destroy,entries,filter,group,valid,state};
})();
