const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'clubs-data.js'),'utf8').trim();
module.exports=JSON.parse(source.replace(/^window\.CLUB_DIRECTORY\s*=\s*/,'').replace(/;$/,'')).filter(x=>x.kind==='club');
