import {test} from 'node:test';import assert from 'node:assert/strict';
import {database} from '../server/database.js';import {verifyGoogle,googleUser} from '../server/google.js';
const fake=t=>async()=>({ok:true,json:async()=>t});
test('Google: token verificato e account creato una sola volta',async()=>{process.env.GOOGLE_CLIENT_ID='cid';const ok={aud:'cid',iss:'https://accounts.google.com',exp:String(Date.now()/1000+60),email_verified:'true',sub:'g1',email:'a@b.it',given_name:'Mario Rossi'};
 await assert.rejects(verifyGoogle('x',fake({...ok,aud:'altro'})),/non valido/);await assert.rejects(verifyGoogle('x',fake({...ok,email_verified:'false'})),/non valido/);
 const g=await verifyGoogle('x',fake(ok)),db=database(':memory:');const a=googleUser(db,g,'h'),b=googleUser(db,g,'h');
 assert.equal(a.created,true);assert.equal(b.created,false);assert.equal(a.user.id,b.user.id);assert.match(a.user.username,/^[A-Za-z0-9_]{3,20}$/);
 const c=googleUser(db,{...g,sub:'g2'},'h');assert.notEqual(c.user.username,a.user.username);delete process.env.GOOGLE_CLIENT_ID;await assert.rejects(verifyGoogle('x',fake(ok)),/non configurato/);});
