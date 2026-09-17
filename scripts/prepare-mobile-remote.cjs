const fs=require('node:fs'),path=require('node:path');
const {download}=require('./download-tool.cjs');
const executable=path.resolve(__dirname,'../.tools/cloudflared.exe');
async function install(){
  await download('https://github.com/cloudflare/cloudflared/releases/download/2026.9.1/cloudflared-windows-amd64.exe',executable,'2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712');
  return executable;
}
if(require.main===module)install().then(()=>console.log('Cloudflare prêt dans .tools.')).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={install,executable};
