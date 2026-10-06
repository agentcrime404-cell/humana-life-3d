// Editor della mappa per gli admin: documento salvato in SQLite, applicato al mondo condiviso e inviato a tutti i giocatori.
import {applyMapEdits,editMapDoc,MAPS} from '../shared/world.js';import {MODE} from '../shared/front.js';
const list=v=>(v||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
export class MapEditor{
 constructor(db,game){this.db=db;this.game=game;this.history=[];const row=db.prepare('SELECT doc FROM map_edits WHERE id=1').get();this.doc=row?JSON.parse(row.doc):{add:[],mod:{},del:[]};applyMapEdits(this.doc);game.mapDoc=this.doc;}
 // Admin: nomi in ADMIN_USERS oppure email Google in ADMIN_EMAILS (separati da virgola).
 isAdmin(user){if(!user)return false;if(list(process.env.ADMIN_USERS).includes(user.username.toLowerCase()))return true;const g=this.db.prepare('SELECT email FROM google_accounts WHERE user_id=?').get(user.id);return !!g&&list(process.env.ADMIN_EMAILS).includes(g.email.toLowerCase());}
 apply(user,op){if(!this.isAdmin(user))throw Object.assign(new Error('Solo gli admin possono modificare la mappa'),{status:403});
  let doc,id=null;if(op.op==='undo'){if(!this.history.length)throw Object.assign(new Error('Niente da annullare'),{status:400});doc=this.history.pop();}
  else{try{if(op.op==='settings'){doc={...this.doc,settings:{...(this.doc.settings||{})}};if('npc' in op)doc.settings.npc=!!op.npc;if('view' in op)doc.settings.view=op.view==='front'?'front':'iso';}
   else{const sub=MODE.front?(this.doc.front||{}):this.doc,r=editMapDoc(sub,op);id=r.id;doc=MODE.front?{...this.doc,front:r.doc}:{...r.doc,front:this.doc.front,settings:this.doc.settings};}}catch(e){throw Object.assign(e,{status:400});}this.history.push(this.doc);if(this.history.length>60)this.history.shift();}
  this.doc=doc;this.game.mapDoc=doc;this.db.prepare('INSERT INTO map_edits(id,doc,updated) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET doc=excluded.doc,updated=excluded.updated').run(JSON.stringify(doc),Date.now());
  const was=MODE.front;applyMapEdits(doc);if(was!==MODE.front)for(const p of this.game.players.values()){if(p.room==='lungomare'){Object.assign(p,MAPS.lungomare.spawn);p.vehicle=null;p.job=null;}}
  for(const p of this.game.players.values())this.game.send(p.ws,{type:'mapEdits',doc});return {doc,id,undo:this.history.length};}
}
