const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { MongoClient } = require('mongodb');
const { createAuth } = require('../auth.cjs');
const { createServer } = require('../server.cjs');
const { executable } = require('./prepare-mobile-remote.cjs');
const root = path.resolve(__dirname, '..');

async function startPublicSite({ origin, uri, dbName = 'sportsensemble', port = 9013 }) {
  const address = new URL(origin);
  if (address.protocol !== 'https:' || address.origin !== origin) throw Error('Une origine HTTPS sans chemin est nécessaire.');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Port invalide.');
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName) || ['admin', 'local', 'config'].includes(dbName)) throw Error('Base applicative invalide.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  let server;
  try {
    await client.connect();
    const auth = await createAuth(client.db(dbName), { origin, secureCookie: true });
    server = createServer(auth);
    server.requestTimeout = 20000;
    server.headersTimeout = 15000;
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    let closing;
    return { server, close() {
      return closing ||= (async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        await client.close();
      })();
    } };
  } catch (error) {
    if (server?.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await client.close();
    throw error;
  }
}

async function ensurePortAvailable(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}

async function main() {
  const envFile = path.join(root, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const port = Number(process.env.SITE_PUBLIC_PORT || 9013);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('SITE_PUBLIC_PORT invalide.');
  if (!fs.existsSync(executable)) throw Error('Cloudflare absent. Voir SITE-PUBLIC.md pour sa préparation.');
  await ensurePortAvailable(port);
  const addressFile = path.join(root, 'site-public-url.txt');
  if (fs.existsSync(addressFile)) fs.unlinkSync(addressFile);
  const logFile = path.join(root, '.tools/site-tunnel.log');
  fs.writeFileSync(logFile, '');
  const tunnel = spawn(executable, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2'], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  });
  let service, starting, closing = false, pending = '', url = '';
  let rejectAddress;
  let timer;
  async function stop(code = 0) {
    if (closing) return;
    closing = true;
    clearTimeout(timer);
    rejectAddress?.(Error('Accès public interrompu.'));
    tunnel.kill();
    try { if (starting) service = await starting; } catch { /* Startup failure already reported. */ }
    if (service) await service.close();
    if (url && fs.existsSync(addressFile) && fs.readFileSync(addressFile, 'utf8').trim() === url) fs.unlinkSync(addressFile);
    process.exitCode = code;
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop(); });
  console.log('Création du lien HTTPS du site…');
  try {
    url = await new Promise((resolve, reject) => {
      rejectAddress = reject;
      timer = setTimeout(() => reject(Error('Adresse HTTPS indisponible. Vérifier Internet et .tools/site-tunnel.log.')), 60000);
      function output(chunk) {
        fs.appendFileSync(logFile, chunk);
        pending = (pending + chunk.toString()).slice(-16384);
        const match = pending.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      }
      tunnel.stdout.on('data', output);
      tunnel.stderr.on('data', output);
      tunnel.on('error', () => reject(Error('Impossible de lancer Cloudflare.')));
      tunnel.on('exit', () => {
        if (!closing) {
          reject(Error('Le tunnel Cloudflare a été fermé.'));
          console.error('Accès public fermé. Relancer npm run site:remote.');
          void stop(1);
        }
      });
    });
    if (closing) return;
    starting = startPublicSite({
      origin: url, port,
      uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
      dbName: process.env.MONGODB_DB || 'sportsensemble'
    });
    service = await starting;
    if (closing) { await service.close(); return; }
    fs.writeFileSync(addressFile, url + '\n');
    console.log(`\nSite à partager : ${url}\n\nLes visiteurs utilisent leur navigateur et leur compte SportsEnsemble.\nGarder le PC allumé et cette fenêtre ouverte. Ctrl+C ferme cet accès.\nLien temporaire : il change au redémarrage.\nL’adresse est enregistrée dans site-public-url.txt.\n`);
  } catch (error) {
    await stop(1);
    throw error;
  }
}

if (require.main === module) main().catch(error => {
  console.error(error.code === 'EADDRINUSE'
    ? 'Le site public est déjà lancé sur ce port. Consulte site-public-url.txt.'
    : 'Démarrage public impossible. Vérifie Internet, la connexion Atlas dans .env et le journal .tools/site-tunnel.log. Aucun identifiant n’est affiché.');
  process.exitCode = 1;
});
module.exports = { startPublicSite };
