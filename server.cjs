const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { MongoClient } = require('mongodb');
const { createAuth } = require('./auth.cjs');
const files = {
  '/vendor/leaflet.js': ['node_modules/leaflet/dist/leaflet.js','text/javascript; charset=utf-8'],
  '/vendor/leaflet.css': ['node_modules/leaflet/dist/leaflet.css','text/css; charset=utf-8'],
  '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'], '/core.js': ['core.js', 'text/javascript; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/auth.js': ['auth.js', 'text/javascript; charset=utf-8']
};
function createServer(auth, { healthCheck } = {}) {
  return http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname === '/healthz' && ['GET','HEAD'].includes(req.method) && healthCheck) {
      Promise.resolve().then(healthCheck).then(() => {res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method === 'HEAD' ? undefined : '{"ok":true}');}).catch(() => {res.writeHead(503, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method === 'HEAD' ? undefined : '{"ok":false}');});
      return;
    }
    if (pathname.startsWith('/api/')) { auth(req, res, pathname); return; }
    const asset = /^\/assets\/clubs\/[a-z0-9-]+\.(svg|png|webp|jpg)$/.exec(pathname);
    const mime = {svg:'image/svg+xml',png:'image/png',webp:'image/webp',jpg:'image/jpeg'};
    const file = files[pathname] || (['/site-config.js','/auth-transport.js','/directory.js','/clubs-data.js','/map-data.js','/sports-map.js','/agenda-core.js','/personal-agenda.js','/week-core.js','/weekly-planner.js'].includes(pathname) ? [pathname.slice(1),'text/javascript; charset=utf-8'] : asset ? [pathname.slice(1),mime[asset[1]]] : null);
    if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Introuvable'); }
    fs.readFile(path.join(__dirname, file[0]), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Lecture impossible'); }
      res.writeHead(200, {
        'Content-Type': file[1], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
        'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}
async function main() {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const port = Number(process.env.PORT || 9010);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT invalide.');
  const dbName = process.env.MONGODB_DB || 'sportsensemble';
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName) || ['local', 'admin', 'config'].includes(dbName)) throw Error('Choisis une base applicative dédiée.');
  const onRender = process.env.RENDER === 'true';
  const host = onRender ? '0.0.0.0' : '127.0.0.1';
  const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`, parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw Error('APP_ORIGIN doit être une origine HTTP(S) sans chemin ni barre finale.');
  if (onRender && (!process.env.MONGODB_URI || parsed.protocol !== 'https:')) throw Error('Configuration Render incomplète.');
  const tokenOrigins = (process.env.FRONTEND_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const auth = await createAuth(client.db(dbName), { origin, secureCookie: parsed.protocol === 'https:', tokenOrigins });
    const server = createServer(auth, {healthCheck: () => client.db(dbName).command({ping:1}, {timeoutMS:3000})});
    server.on('error', async error => {
      console.error(error.code === 'EADDRINUSE' ? `Le port ${port} est déjà utilisé. Arrête l’ancien serveur avec Ctrl+C, puis relance npm start.` : 'Le serveur ne peut pas démarrer.');
      await client.close(); process.exitCode = 1;
    });
    server.listen(port, host, () => console.log(`SportsEnsemble : ${origin}\nMongoDB : base ${dbName} — collections users et sessions${onRender ? '' : '\nGarde cette fenêtre ouverte. Ctrl+C pour arrêter.'}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await client.close(); process.exit(0); }));
    return { server, client };
  } catch (error) {
    await client.close();
    if (!process.env.MONGODB_URI) {
      console.error('Connexion MongoDB locale indisponible. Pour utiliser Atlas sur ce PC, copie .env.example vers .env puis renseigne sa connexion dans MONGODB_URI. Le fichier .env privé ne vient pas de GitHub. Voir ATLAS.md.');
    } else if (error.code === 18 || /bad auth|authentication failed/i.test(error.message || '')) {
      console.error('MongoDB refuse les identifiants. Vérifie le nom et le mot de passe de l’utilisateur de base de données dans MONGODB_URI. Ce compte est distinct du compte de connexion au site Atlas.');
    } else if (/^mongodb\+srv:|\.mongodb\.net/i.test(process.env.MONGODB_URI)) {
      console.error('Connexion Atlas impossible. Vérifie Internet, la connexion MONGODB_URI, que le cluster est actif et que l’adresse IP publique de ce PC est autorisée dans Atlas > Network Access. MongoDB Server et Compass ne sont pas nécessaires sur ce PC. Voir ATLAS.md.');
    } else {
      console.error('Connexion MongoDB impossible. Vérifie MONGODB_URI dans .env et que le serveur MongoDB correspondant est accessible. Pour Atlas, voir ATLAS.md.');
    }
    process.exitCode = 1;
  }
}
if (require.main === module) main().catch(() => { console.error('Configuration du serveur invalide. Vérifie .env.'); process.exitCode = 1; });
module.exports = { createServer, main };
