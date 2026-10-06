// Compila l'APK di debug con Gradle e lo copia in dist/HUMANA.apk.
import {spawnSync} from 'node:child_process';import {copyFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),android=fileURLToPath(new URL('android/',root));
// Java 21 portatile (in ../tools): Gradle non funziona con Java 27.
import {existsSync,readdirSync} from 'node:fs';
{const t=fileURLToPath(new URL('../tools/',root));if(existsSync(t)){const j=readdirSync(t).find(d=>d.startsWith('jdk-21'));if(j)process.env.JAVA_HOME=t+j;}}
const run=(cmd,args,cwd)=>{const r=spawnSync(cmd,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1);};
run('node',['scripts/build-mobile.mjs'],fileURLToPath(root));
run('npx',['cap','sync','android'],fileURLToPath(root));
run(process.platform==='win32'?`"${android}gradlew.bat"`:'./gradlew',['assembleDebug'],android);
await mkdir(new URL('dist/',root),{recursive:true});
await copyFile(new URL('android/app/build/outputs/apk/debug/app-debug.apk',root),new URL('dist/HUMANA.apk',root));
console.log('APK pronto: dist/HUMANA.apk');
