import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store';
import { HostedGame, hostedSchema } from '../server/hosted';
import { Engine, defaultTiming } from '../server/engine';
test('separate hosted instances share rooms, private roles, receipts and controller leases',async()=>{
 const store=new Store('memory:');try{
  await store.embedded!.exec(hostedSchema);const factory=()=>new Engine({...defaultTiming,reveal:0});
  const a=new HostedGame(store.pool,factory),b=new HostedGame(store.pool,factory);
  const ta=(await a.session(undefined,'one')).token!,tb=(await b.session(undefined,'two')).token!,tc=(await b.session(undefined,'three')).token!;
  const ca=randomUUID(),cb=randomUUID(),cc=randomUUID();
  const cmd=(type:string,payload:Record<string,unknown>={},roundId?:string)=>({id:randomUUID(),type,payload,roundId});
  const create=cmd('room.create',{name:'Cipher',mode:'social'});
  const x:any=await a.sync(ta,{controller:ca,claim:true,command:create});const code=x.snapshot.room.code;
  const replay:any=await b.sync(ta,{controller:ca,command:create});assert.equal(replay.snapshot.room.code,code);assert.equal(replay.snapshot.room.players.length,1);
  const mismatch:any=await b.sync(ta,{controller:ca,command:{...create,payload:{name:'Changed',mode:'social'}}});assert.equal(mismatch.response.code,'REPLAY_MISMATCH');
  await b.sync(tb,{controller:cb,claim:true,command:cmd('room.join',{name:'Echo',code})});await b.sync(tc,{controller:cc,claim:true,command:cmd('room.join',{name:'Vector',code})});
  for(const [token,controller]of [[ta,ca],[tb,cb],[tc,cc]])await b.sync(token,{controller,command:cmd('lobby.ready',{ready:true})});
  const start:any=await a.sync(ta,{controller:ca,command:cmd('round.start')});const rid=start.snapshot.room.roundId;
  await new Promise(r=>setTimeout(r,60));const views:any[]=[];for(const [token,controller]of [[ta,ca],[tb,cb],[tc,cc]])views.push(await b.sync(token,{controller}));
  assert.equal(views.filter(x=>x.snapshot.self.role==='traitor').length,1);
  for(const x of views){assert.equal(x.snapshot.room.players.length,3);assert.ok(!('roles'in x.snapshot.room));assert.ok(!('culprit'in x.snapshot.room));assert.ok(x.snapshot.room.players.every((p:any)=>!('session'in p)));}
  const agent=views.findIndex(x=>x.snapshot.self.role==='agent');const pairs=[[ta,ca],[tb,cb],[tc,cc]];
  const deny:any=await b.sync(pairs[agent][0],{controller:pairs[agent][1],command:cmd('sabotage',{ability:'forge',target:'footage'},rid)});assert.equal(deny.response.code,'FORBIDDEN');
  const newController=randomUUID();await b.sync(ta,{controller:newController,claim:true});const replaced:any=await a.sync(ta,{controller:ca});assert.equal(replaced.code,'SESSION_REPLACED');
  const resumed:any=await a.sync(ta,{controller:newController});assert.equal(resumed.snapshot.self.id,start.snapshot.self.id);assert.equal(resumed.snapshot.self.role,start.snapshot.self.role);
  await assert.rejects(a.sync('invalid',{controller:ca}),/guest session/);
 }finally{await store.close();}
});
