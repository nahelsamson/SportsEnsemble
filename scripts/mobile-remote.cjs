const fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const {startMobileServer}=require('../mobile-server.cjs');
const {executable}=require('./prepare-mobile-remote.cjs');
async function main(){
  if(!fs.existsSync(executable)) throw Error('Installer Cloudflare avec node scripts/prepare-mobile-remote.cjs après acceptation de ses conditions. Voir ANDROID.md.');
  const {server,close}=await startMobileServer();
  const addressFile=path.resolve(__dirname,'../mobile-server-url.txt');
  if(fs.existsSync(addressFile))fs.unlinkSync(addressFile);
  console.log('Création de l’accès mobile HTTPS de test…');
  const tunnel=spawn(executable,['tunnel','--no-autoupdate','--url',`http://127.0.0.1:${server.address().port}`,'--protocol','http2'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let pending='',url='',closing=false;
  async function stop(code=0){if(closing)return;closing=true;tunnel.kill();await close();process.exitCode=code;}
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>stop());
  tunnel.on('error',()=>{console.error('Impossible de lancer Cloudflare.');stop(1);});
  tunnel.on('exit',code=>{if(!closing){console.error('Accès distant fermé. Relancer npm run mobile:remote.');stop(code||1);}});
  const timeout=setTimeout(()=>{if(!url){console.error('Impossible d’obtenir une adresse distante. Vérifier Internet.');stop(1);}},60000);
  timeout.unref();
  const logFile=path.resolve(__dirname,'../.tools/mobile-tunnel.log');
  fs.writeFileSync(logFile,'');
  function output(chunk){
    fs.appendFileSync(logFile,chunk);
    pending=(pending+chunk.toString()).slice(-8192);
    const match=pending.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if(!match||url)return;url=match[0];clearTimeout(timeout);
    fs.writeFileSync(addressFile,url+'\n');
    console.log(`\nAdresse du serveur à utiliser dans Android :\n${url}\n\nGarder cette fenêtre ouverte et le PC allumé. Ctrl+C ferme l’accès.\nL’adresse est temporaire et peut changer au prochain lancement.\nConnexion au compte requise pour lire le planning. Aucun accès direct à MongoDB.\n`);
  }
  tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);
}
main().catch(error=>{console.error(error.code==='EADDRINUSE'?'Le service mobile utilise déjà ce port. Fermer l’ancien service avant de relancer.':error.message);process.exitCode=1;});
