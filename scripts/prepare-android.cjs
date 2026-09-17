const fs=require('node:fs'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const javaInfo=spawnSync('java',['-XshowSettings:properties','-version'],{encoding:'utf8',windowsHide:true});
const javaHome=javaInfo.stderr?.match(/java.home = (.+)/)?.[1].trim();
if(!javaHome)throw Error('Installer un JDK récent (25 recommandé).');
const {download}=require('./download-tool.cjs');
const root=path.resolve(__dirname,'..'),tools=path.join(root,'.tools');
const sdk=path.join(tools,'android-sdk'),user=path.join(root,'.private','android-user');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
function run(exe,args,input) {return new Promise((resolve,reject)=>{
  const binary=['java','jar','keytool'].includes(exe)?path.join(javaHome,'bin',exe+'.exe'):exe;
  const child=spawn(binary,args,{cwd:root,windowsHide:true,env:{...process.env,ANDROID_HOME:sdk,ANDROID_USER_HOME:user},stdio:[input?'pipe':'ignore','inherit','inherit']});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${exe} : code ${code}`)));
  if(input){child.stdin.on('error',()=>{});child.stdin.end(input);}
});}
async function main(){
  if(!process.argv.includes('--accept-sdk-license')) throw Error('L’accord à la licence Android SDK est nécessaire. Relancer avec --accept-sdk-license seulement après acceptation.');
  fs.mkdirSync(tools,{recursive:true});fs.mkdirSync(user,{recursive:true});
  const wrapper=path.join(root,'android','gradle','wrapper');fs.mkdirSync(wrapper,{recursive:true});
  const checks=await fetch('https://services.gradle.org/distributions/gradle-9.1.0-wrapper.jar.sha256');
  if(!checks.ok)throw Error('Vérification Gradle indisponible.');
  const checksum=(await checks.text()).trim();if(!/^[a-f0-9]{64}$/.test(checksum))throw Error('Empreinte Gradle invalide.');
  await download('https://raw.githubusercontent.com/gradle/gradle/v9.1.0/gradle/wrapper/gradle-wrapper.jar',path.join(wrapper,'gradle-wrapper.jar'),checksum);
  for(const name of ['gradlew','gradlew.bat']) await download('https://raw.githubusercontent.com/gradle/gradle/v9.1.0/'+name,path.join(root,'android',name));
  fs.writeFileSync(path.join(wrapper,'gradle-wrapper.properties'),'distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-9.1.0-bin.zip\ndistributionSha256Sum=a17ddd85a26b6a7f5ddb71ff8b05fc5104c0202c6e64782429790c933686c806\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\nnetworkTimeout=120000\nvalidateDistributionUrl=true\n');
  const zip=path.join(tools,'android-commandline.zip'),extract=path.join(tools,'android-commandline');
  console.log('Téléchargement des outils officiels Android…');
  await download('https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip',zip,'90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a');
  fs.mkdirSync(extract,{recursive:true}); await run('jar',['--extract','--file',zip,'--dir',extract]);
  console.log('Installation du SDK Android 36 et des outils de compilation…');
  await run('java',['-Duser.home='+user,'-cp',path.join(extract,'cmdline-tools','lib','*'),'com.android.sdklib.tool.sdkmanager.SdkManagerCli','--sdk_root='+sdk,'platforms;android-36','build-tools;36.0.0','platform-tools'],'y\n'.repeat(20));
  fs.writeFileSync(path.join(root,'android','local.properties'),'sdk.dir='+sdk.replaceAll('\\','/').replaceAll(':','\\:')+'\n');
  const key=path.join(root,'.private','android-debug.keystore');
  if(!fs.existsSync(key)) await run('keytool',['-genkeypair','-keystore',key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=SportsEnsemble Debug,O=SportsEnsemble,C=FR']);
  console.log('Outils prêts. Lancer android/Compiler-Android.ps1 pour fabriquer le fichier APK.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
