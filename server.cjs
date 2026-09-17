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
function createServer(auth) {
  return http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname.startsWith('/api/')) { auth(req, res, pathname); return; }
    const asset = /^\/assets\/clubs\/[a-z0-9-]+\.(svg|png|webp|jpg)$/.exec(pathname);
    const mime = {svg:'image/svg+xml',png:'image/png',webp:'image/webp',jpg:'image/jpeg'};
    const file = files[pathname] || (['/directory.js','/clubs-data.js','/map-data.js','/sports-map.js','/agenda-core.js','/personal-agenda.js','/week-core.js','/weekly-planner.js'].includes(pathname) ? [pathname.slice(1),'text/javascript; charset=utf-8'] : asset ? [pathname.slice(1),mime[asset[1]]] : null);
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
  const origin = process.env.APP_ORIGIN || `http://localhost:${port}`, parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw Error('APP_ORIGIN doit être une origine HTTP(S) sans chemin ni barre finale.');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const auth = await createAuth(client.db(dbName), { origin, secureCookie: parsed.protocol === 'https:' });
    const server = createServer(auth);
    server.on('error', async error => {
      console.error(error.code === 'EADDRINUSE' ? `Le port ${port} est déjà utilisé. Arrête l’ancien serveur avec Ctrl+C, puis relance npm start.` : 'Le serveur ne peut pas démarrer.');
      await client.close(); process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => console.log(`SportsEnsemble : ${origin}\nMongoDB : base ${dbName} — collections users et sessions\nGarde cette fenêtre ouverte. Ctrl+C pour arrêter.`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await client.close(); process.exit(0); }));
    return { server, client };
  } catch {
    await client.close();
    console.error('Démarrage impossible : vérifie que MongoDB fonctionne et que MONGODB_URI dans .env correspond à ta connexion Compass.');
    process.exitCode = 1;
  }
}
if (require.main === module) main().catch(() => { console.error('Configuration du serveur invalide. Vérifie .env.'); process.exitCode = 1; });
module.exports = { createServer, main };
