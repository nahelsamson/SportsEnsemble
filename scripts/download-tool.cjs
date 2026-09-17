const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
async function download(url, destination, sha256) {
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  const hash = file => new Promise((resolve,reject) => { const h=crypto.createHash('sha256'); const s=fs.createReadStream(file); s.on('error',reject); s.on('data',chunk=>h.update(chunk)); s.on('end',()=>resolve(h.digest('hex'))); });
  if(fs.existsSync(destination) && (!sha256 || await hash(destination)===sha256)) return;
  const response=await fetch(url,{signal:AbortSignal.timeout(600000)});
  if(!response.ok) throw Error(`Téléchargement indisponible (${response.status}) : ${new URL(url).hostname}`);
  const partial=destination+'.part';
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(partial));
  if(sha256 && await hash(partial)!==sha256) { fs.unlinkSync(partial); throw Error('Empreinte du téléchargement incorrecte.'); }
  fs.renameSync(partial,destination);
}
module.exports={download};
