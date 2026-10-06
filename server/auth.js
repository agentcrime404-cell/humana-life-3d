import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export const digest=s=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${(await derive(password,salt,64)).toString('hex')}`;}
export async function verify(password,stored){const [salt,key]=stored.split(':');return timingSafeEqual(Buffer.from(key,'hex'),await derive(password,salt,64));}
export function token(db,id){const t=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(t),id,Date.now()+86400000*180);return t;}
export function resolve(db,t){if(typeof t!=='string'||t.length>128)return null;return db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(digest(t),Date.now());}
export const publicUser=u=>({id:u.id,username:u.username,bio:u.bio,avatar:JSON.parse(u.avatar)});
