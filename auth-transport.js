'use strict';
window.SportsTransport = (() => {
  const configured = window.SPORTSENSEMBLE_CONFIG?.apiOrigin || '';
  const isPages = location.hostname === 'nahelsamson.github.io';
  const apiOrigin = isPages ? configured : location.origin;
  const remote = apiOrigin !== location.origin;
  const storageKey = 'sportsensemble-session:' + apiOrigin;
  let token = '';
  try { if (remote) token = sessionStorage.getItem(storageKey) || ''; } catch { /* Memory-only session if storage is unavailable. */ }
  function saveToken(value) {
    token = value;
    try { if (value) sessionStorage.setItem(storageKey, value); else sessionStorage.removeItem(storageKey); } catch { /* Memory-only session. */ }
  }
  async function request(endpoint, data) {
    if (!apiOrigin) throw Error('La connexion aux comptes est en cours de configuration. Réessaie plus tard.');
    if (remote) {
      const parsed = new URL(apiOrigin);
      if (parsed.protocol !== 'https:' || parsed.origin !== apiOrigin) throw Error('Adresse du serveur invalide.');
    }
    const headers = {};
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    if (remote) {
      headers['X-Session-Mode'] = 'token';
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    let response;
    try {
      response = await fetch(apiOrigin + '/api/auth/' + endpoint, {
        headers, credentials: remote ? 'omit' : 'same-origin', signal: AbortSignal.timeout(90000),
        ...(data === undefined ? {} : {method:'POST', body:JSON.stringify(data)})
      });
    } catch { throw Error('Le serveur est indisponible ou en cours de réveil. Patiente une minute puis réessaie.'); }
    let result;
    try { result = await response.json(); } catch { throw Error('Le serveur ne répond pas correctement. Réessaie dans une minute.'); }
    if (!response.ok) {
      if (remote && response.status === 401) saveToken('');
      throw Error(result.error || 'La demande a échoué.');
    }
    if (remote) {
      if (typeof result.sessionToken === 'string' && /^[a-f0-9]{64}$/.test(result.sessionToken)) saveToken(result.sessionToken);
      if (endpoint === 'logout' || (endpoint === 'me' && !result.user)) saveToken('');
      delete result.sessionToken;
    }
    return result;
  }
  return { request };
})();
