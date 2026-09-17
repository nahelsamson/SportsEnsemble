const Reviews = (() => {
  const escape = AixCore.escape;
  let refreshTimer;
  function destroy() { clearInterval(refreshTimer); }
  function render() {
    return `<section class="container reviews-page"><p class="eyebrow">La parole à la communauté</p><h1>Vos avis</h1>
      <p class="muted">Partage ton expérience de SportsEnsemble. Retrouve ici les avis publiés sur le site et l’application.</p>
      <div class="reviews-layout"><section class="panel review-compose"><h2>Ajouter un avis</h2>
      ${Auth.user ? `<p>Tu publies sous le nom <strong>${escape(Auth.user.name)}</strong>.</p>
        <form id="review-form"><label for="review-rating">Ta note sur 10</label><select id="review-rating" name="rating" required>
        <option value="">Choisir une note</option>${Array.from({length:11},(_,i)=>`<option value="${i}">${i} / 10</option>`).join('')}</select>
        <label for="review-comment">Ton commentaire</label><textarea id="review-comment" name="comment" required maxlength="2000" rows="5" placeholder="Qu’as-tu pensé de ton expérience ?"></textarea>
        <p class="small muted">2 000 caractères maximum. Ton avis et ton nom seront publics. Une fois publié, l’avis ne pourra plus être modifié.</p>
        <p id="review-form-status" role="status" aria-live="polite"></p><button type="submit">Publier mon avis</button></form>`
        : '<p>Connecte-toi pour publier une note et un commentaire.</p><a class="button" href="#connexion">Se connecter</a>'}</section>
      <section class="reviews-feed" aria-labelledby="reviews-title"><div class="section-title"><h2 id="reviews-title">Tous les avis</h2><button id="reviews-refresh" class="ghost">Actualiser</button></div>
      <p id="reviews-status" role="status" aria-live="polite">Chargement des avis…</p><div id="reviews-list"></div><button id="reviews-more" class="ghost" hidden>Voir les avis précédents</button></section></div></section>`;
  }
  function card(review) {
    const date = new Date(review.createdAt).toLocaleString('fr-FR', {dateStyle:'long',timeStyle:'short'});
    return `<article class="panel review-card"><div class="review-card-heading"><div><h3>${escape(review.authorName)}</h3><time datetime="${escape(review.createdAt)}" class="small muted">${escape(date)}</time></div><strong class="review-score" aria-label="Note : ${escape(review.rating)} sur 10">${escape(review.rating)}<small>/10</small></strong></div><p class="review-comment">${escape(review.comment)}</p></article>`;
  }
  function bind() {
    const list = document.getElementById('reviews-list');
    if (!list) return;
    const alive = () => list.isConnected;
    const status = document.getElementById('reviews-status'), more = document.getElementById('reviews-more'), refresh = document.getElementById('reviews-refresh');
    let cursor = null, loading = false, ids = new Set(), requestId = '', payloadKey = '', posting = false;
    async function load(append = false) {
      if (loading || !alive()) return;
      loading = true; more.disabled = refresh.disabled = true;
      status.textContent = 'Chargement des avis…';
      try {
        const result = await Auth.request('reviews' + (append && cursor ? '?before=' + encodeURIComponent(cursor) : ''));
        if (!alive()) return;
        if (!append) { list.innerHTML = ''; ids = new Set(); }
        const unseen = result.reviews.filter(review => !ids.has(review.id));
        unseen.forEach(review => ids.add(review.id));
        list.insertAdjacentHTML('beforeend', unseen.map(card).join(''));
        cursor = result.nextCursor; more.hidden = !cursor;
        status.textContent = result.total ? `${ids.size} avis affiché${ids.size > 1 ? 's' : ''} sur ${result.total} · les plus récents en premier` : 'Pas encore d’avis. Partage le premier !';
      } catch (error) { if (alive()) status.textContent = error.message; }
      finally { loading = false; if (alive()) more.disabled = refresh.disabled = false; }
    }
    refresh.onclick = () => load(); more.onclick = () => load(true);
    const form = document.getElementById('review-form');
    if (form) form.onsubmit = async event => {
      event.preventDefault(); if (posting) return;
      const message = document.getElementById('review-form-status');
      const data = {rating:Number(form.elements.rating.value),comment:form.elements.comment.value.trim()};
      if (!form.elements.rating.value || !data.comment) { message.textContent = 'Choisis une note et écris un commentaire.'; return; }
      const key = JSON.stringify(data);
      if (key !== payloadKey) { requestId = crypto.randomUUID(); payloadKey = key; }
      posting = true; form.querySelectorAll('input,select,textarea,button').forEach(control => control.disabled = true);
      message.textContent = 'Publication en cours…';
      try {
        await Auth.request('reviews', {...data, requestId});
        if (!alive()) return;
        form.reset(); payloadKey = ''; requestId = ''; message.textContent = 'Ton avis a été publié. Il est visible sur le site et l’application.';
        // Wait for any older list request before reloading the new publication.
        while (loading && alive()) await new Promise(resolve => setTimeout(resolve, 100));
        await load();
      } catch (error) { if (alive()) message.textContent = error.message; }
      finally { posting = false; if (alive()) form.querySelectorAll('input,select,textarea,button').forEach(control => control.disabled = false); }
    };
    load();
    // Do not collapse older pages while someone is reading them or clear a draft.
    refreshTimer = setInterval(() => { if (!document.hidden && ids.size <= 20 && !posting) load(); }, 60000);
  }
  return {render, bind, destroy};
})();
