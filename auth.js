'use strict';
const Auth = {
  ready: false, user: null, error: '',
  async request(path, data) { return SportsTransport.request(path, data); },
  async init() {
    try { this.user = (await this.request('me')).user; this.error = ''; }
    catch (error) { this.error = error.message; this.user = null; }
    this.ready = true; route();
  },
  header() {
    document.getElementById('account-nav').innerHTML = this.user ? `<a class="button ghost" href="#compte">${AixCore.escape(this.user.name)}</a>` : '<a class="button ghost" href="#connexion">Se connecter</a>';
  },
  page(register = false, protectedPage = false) {
    return `<section class="container auth-container"><div class="panel auth-panel"><span class="badge">SPORTSENSEMBLE</span><h1>${register ? 'Créer un compte' : 'Content de te revoir'}</h1><p class="muted">${protectedPage ? 'Connecte-toi pour accéder à l’espace de gestion.' : register ? 'Rejoins le sport local et retrouve ton compte à chaque visite.' : 'Connecte-toi à ton compte Aix Sport Local.'}</p>${this.error ? `<p class="error" role="alert">${AixCore.escape(this.error)}</p><button id="auth-retry" class="ghost">Réessayer la connexion au serveur</button>` : ''}<form id="auth-form" data-register="${register}">${register ? '<div class="field"><label for="auth-name">Nom affiché</label><input id="auth-name" name="name" autocomplete="name" required minlength="2" maxlength="80"></div>' : ''}<div class="field"><label for="auth-email">Adresse e-mail</label><input id="auth-email" name="email" type="email" autocomplete="username" required maxlength="254"></div><div class="field"><label for="auth-password">Mot de passe</label><input id="auth-password" name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" required ${register ? 'minlength="12"' : ''} maxlength="128">${register ? '<small class="muted">Au moins 12 caractères. Tu peux utiliser une phrase de passe.</small>' : ''}</div>${register ? '<div class="field"><label for="auth-confirm">Confirmer le mot de passe</label><input id="auth-confirm" name="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="128"></div>' : ''}<p id="auth-error" class="error" role="alert"></p><button id="auth-submit" type="submit">${register ? 'Créer mon compte' : 'Me connecter'}</button></form><p>${register ? 'Déjà inscrit ? <a class="text-link" href="#connexion">Se connecter</a>' : 'Pas encore de compte ? <a class="text-link" href="#inscription">Créer un compte</a>'}</p><a class="back" href="#accueil">← Retour au site</a></div></section>`;
  },
  account() {
    if (!this.user) return this.page();
    return `<section class="container auth-container"><div class="panel auth-panel"><span class="badge">MON COMPTE</span><h1>Bonjour ${AixCore.escape(this.user.name)}</h1><p class="muted">${AixCore.escape(this.user.email)}</p><p>Ton compte est enregistré dans la base MongoDB du projet.</p><div class="notice">Les articles restent pour l’instant dans ce navigateur. Ils ne sont pas encore associés à ton compte ni synchronisés entre ordinateurs.</div><div class="actions"><a class="button" href="#agenda">Mon agenda sportif</a><a class="button ghost" href="#gestion">Gérer les contenus</a><button id="logout" class="ghost">Se déconnecter</button></div><p id="auth-error" class="error" role="alert"></p></div></section>`;
  },
  bind() {
    const retry = document.getElementById('auth-retry');
    if (retry) retry.onclick = () => { this.ready = false; route(); this.init(); };
    const form = document.getElementById('auth-form');
    if (form) form.onsubmit = async event => {
      event.preventDefault();
      const button = document.getElementById('auth-submit'), error = document.getElementById('auth-error');
      const data = Object.fromEntries(new FormData(form));
      if (form.dataset.register === 'true' && data.password !== data.confirmation) { error.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
      button.disabled = true; error.textContent = ''; const label = button.textContent; button.textContent = 'Connexion en cours…';
      try {
        const result = await this.request(form.dataset.register === 'true' ? 'register' : 'login', { name: data.name, email: data.email, password: data.password });
        this.user = result.user; this.error = ''; form.reset(); location.hash = '#compte'; route(); toast('Tu es connecté.');
      } catch (failure) { error.textContent = failure.message; }
      finally { button.disabled = false; button.textContent = label; }
    };
    const logout = document.getElementById('logout');
    if (logout) logout.onclick = async () => {
      logout.disabled = true;
      try { await this.request('logout', {}); this.user = null; location.hash = '#connexion'; route(); toast('Tu es déconnecté.'); }
      catch (error) { document.getElementById('auth-error').textContent = error.message; logout.disabled = false; }
    };
  }
};
