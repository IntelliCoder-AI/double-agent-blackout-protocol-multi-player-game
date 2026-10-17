import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { startServer } from '../../server/index';

test('same-browser scoped cookies create independent seats and reconnect without replacing each other',{timeout:30000},async()=>{
 const origin='http://127.0.0.1:3058',app=await startServer({port:3058,origin,databaseUrl:'memory:',frontend:false});const sockets:WebSocket[]=[];
 try{
  const seats=[randomUUID(),randomUUID()],cookies:string[]=[];
  for(const seat of seats){const r=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:origin,'X-Player-Seat':seat,Cookie:cookies.join('; ')}});assert.equal(r.status,200);const raw=r.headers.get('set-cookie')!;assert.ok(raw.includes('HttpOnly'));cookies.push(raw.split(';')[0]);}
  assert.notEqual(cookies[0].split('=')[0],cookies[1].split('=')[0]);
  const connect=async(seat:string)=>{
   const ws=new WebSocket(origin.replace('http:','ws:')+'/ws?seat='+seat,{headers:{Origin:origin,Cookie:cookies.join('; ')}});sockets.push(ws);let snap:any;const replies:any[]=[];
   ws.on('message',raw=>{const m=JSON.parse(String(raw));if(m.type==='snapshot')snap=m;else replies.push(m);});
   const wait=async(fn:()=>boolean)=>{for(let n=0;n<200&&!fn();n++)await new Promise(r=>setTimeout(r,20));assert.ok(fn(),'Expected network state');};await wait(()=>!!snap);
   return {ws,wait,get snap(){return snap;},command:async(type:string,payload={})=>{const id=randomUUID();ws.send(JSON.stringify({id,type,payload}));await wait(()=>replies.some(m=>m.id===id));return replies.find(m=>m.id===id);}};
  };
  const a=await connect(seats[0]),b=await connect(seats[1]);assert.equal((await a.command('room.create',{name:'First tab',mode:'coop'})).type,'ack');const code=a.snap.room.code;
  assert.equal((await b.command('room.join',{name:'Second tab',code})).type,'ack');await a.wait(()=>a.snap.room.players.length===2);
  assert.notEqual(a.snap.self.id,b.snap.self.id);assert.equal(a.ws.readyState,WebSocket.OPEN);
  const id=b.snap.self.id;b.ws.close();await a.wait(()=>!a.snap.room.players.find((p:any)=>p.id===id).connected);const resumed=await connect(seats[1]);assert.equal(resumed.snap.self.id,id);assert.equal(a.ws.readyState,WebSocket.OPEN);
  const missing=new WebSocket(origin.replace('http:','ws:')+'/ws?seat='+randomUUID(),{headers:{Origin:origin,Cookie:cookies.join('; ')}});const denied=await new Promise<boolean>(resolve=>{missing.once('unexpected-response',(_req,res)=>{res.resume();resolve(res.statusCode===401);});missing.once('error',()=>resolve(true));missing.once('open',()=>{missing.close();resolve(false);});});assert.ok(denied,'A namespace without its matching guest cookie cannot authenticate');
  if(missing.readyState!==WebSocket.CLOSED)missing.terminate();
  const invalid=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:origin,'X-Player-Seat':'bad;value'}});assert.equal(invalid.status,400);
 }finally{for(const ws of sockets)ws.terminate();await app.close();}
});
