import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { startServer } from '../../server/index';
import { Engine, defaultTiming } from '../../server/engine';
import type { Snapshot } from '../../shared/types';

const origin='http://127.0.0.1:3057';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function guest(cookie?:string){
 if(!cookie){const res=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:origin}});assert.equal(res.status,200);cookie=res.headers.get('set-cookie')!.split(';')[0];assert.ok(res.headers.get('set-cookie')!.includes('HttpOnly'));}
 const ws=new WebSocket(origin.replace('http:','ws:')+'/ws',{headers:{Origin:origin,Cookie:cookie}});
 const messages:any[]=[];let snapshot:Snapshot|null=null;ws.on('message',data=>{const msg=JSON.parse(String(data));messages.push(msg);if(msg.type==='snapshot')snapshot=msg;});
 await new Promise<void>((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 async function wait(predicate:()=>boolean,timeout=5000){const until=Date.now()+timeout;while(!predicate()){if(Date.now()>until)throw Error('Network state did not arrive before timeout.');await delay(20);}}
 await wait(()=>!!snapshot);
 const command=async(type:string,payload:Record<string,unknown>={},id=randomUUID())=>{const request={id,type,payload,roundId:snapshot!.room?.roundId??null};const index=messages.length;ws.send(JSON.stringify(request));await wait(()=>messages.slice(index).some(m=>m.id===id&&['ack','error'].includes(m.type)));return {response:messages.slice(index).find(m=>m.id===id&&['ack','error'].includes(m.type)),request};};
 return{ws,cookie,messages,command,wait,get snapshot(){return snapshot!;}};
}
test('real HTTP and WebSocket guests: rooms, private roles, replay protection, movement, reconnect and rematch',{timeout:30000},async()=>{
 const engine=new Engine({...defaultTiming,reveal:300,investigation:5000,discussion:500,vote:500,runoff:400});
 const app=await startServer({port:3057,origin,databaseUrl:'memory:',engine,frontend:false});const clients:Awaited<ReturnType<typeof guest>>[]=[];
 try{
  const bad=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:'https://untrusted.invalid'}});assert.equal(bad.status,403);
  const a=await guest(),b=await guest(),c=await guest();clients.push(a,b,c);
  const created=await a.command('room.create',{name:'Cipher',mode:'social'});assert.equal(created.response.type,'ack');await a.wait(()=>!!a.snapshot.room);const code=a.snapshot.room!.code;assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  const replayIndex=a.messages.length;a.ws.send(JSON.stringify(created.request));await a.wait(()=>a.messages.slice(replayIndex).some(m=>m.id===created.request.id));assert.equal(a.snapshot.room!.players.length,1);
  const mutation=await a.command('room.create',{name:'Changed',mode:'social'},created.request.id);assert.equal(mutation.response.code,'REPLAY_MISMATCH');
  await b.command('room.join',{name:'Echo',code});await c.command('room.join',{name:'Vector',code});await a.wait(()=>a.snapshot.room?.players.length===3);
  for(const client of clients)assert.equal((await client.command('lobby.ready',{ready:true})).response.type,'ack');await a.command('round.start');await a.wait(()=>a.snapshot.room?.phase==='investigation');await b.wait(()=>b.snapshot.room?.phase==='investigation');await c.wait(()=>c.snapshot.room?.phase==='investigation');
  assert.equal(clients.filter(x=>x.snapshot.self!.role==='traitor').length,1);for(const client of clients){assert.ok(!('roles' in client.snapshot.room!));assert.ok(!('culprit' in client.snapshot.room!));assert.ok(client.snapshot.room!.players.every(p=>!('session' in p)));assert.equal(client.snapshot.self!.clues.length,0);}
  const loyal=clients.find(x=>x.snapshot.self!.role==='agent')!;const denied=await loyal.command('sabotage',{ability:'forge',target:'footage'});assert.equal(denied.response.code,'FORBIDDEN');
  const before=a.snapshot.room!.players[0].x;for(let i=0;i<5;i++){a.ws.send(JSON.stringify({id:randomUUID(),type:'input.move',roundId:a.snapshot.room!.roundId,payload:{x:-1,z:0}}));await delay(80);}await b.wait(()=>b.snapshot.room!.players[0].x<before-.2);
  const role=b.snapshot.self!.role,id=b.snapshot.self!.id,cookie=b.cookie;b.ws.close();await a.wait(()=>!a.snapshot.room!.players.find(p=>p.id===id)!.connected);const recovered=await guest(cookie);clients.push(recovered);assert.equal(recovered.snapshot.self!.id,id);assert.equal(recovered.snapshot.self!.role,role);
  await a.wait(()=>a.snapshot.room?.phase==='results',10000);assert.equal(a.snapshot.room!.result?.winner,'traitor');assert.equal((await a.command('round.rematch')).response.type,'ack');await recovered.wait(()=>recovered.snapshot.room?.phase==='lobby');assert.equal(recovered.snapshot.room!.code,code);
 }finally{for(const c of clients)c.ws.terminate();await app.close();}
});
