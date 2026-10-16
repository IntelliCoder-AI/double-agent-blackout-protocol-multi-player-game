import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {HostedGame,hostedSchema} from '../server/hosted';
import {Engine,defaultTiming} from '../server/engine';
test('native PostgreSQL contention keeps snapshots responsive and privileged actions serialized',{skip:!process.env.CI_POSTGRES_URL,timeout:20000},async()=>{
 const url=new URL(process.env.CI_POSTGRES_URL!);assert.ok(['127.0.0.1','localhost'].includes(url.hostname),'Use a disposable local test database');
 const pool=new pg.Pool({connectionString:url.href,max:8});let lock:pg.PoolClient|undefined;
 try{
  await pool.query(hostedSchema);const game=new HostedGame(pool,()=>new Engine({...defaultTiming,reveal:1}));
  const guests=[] as {token:string;controller:string}[];for(let i=0;i<3;i++)guests.push({token:(await game.session(undefined,'ci-'+i)).token!,controller:randomUUID()});
  const cmd=(type:string,payload:Record<string,unknown>={},roundId?:string)=>({id:randomUUID(),type,payload,roundId});
  const sync=(i:number,command?:ReturnType<typeof cmd>,claim=false)=>game.sync(guests[i].token,{controller:guests[i].controller,command,claim}) as Promise<any>;
  const created=await sync(0,cmd('room.create',{name:'Native Host',mode:'social'}),true);const code=created.snapshot.room.code;
  await sync(1,cmd('room.join',{name:'Native Echo',code}),true);await sync(2,cmd('room.join',{name:'Native Vector',code}),true);
  for(let i=0;i<3;i++)await sync(i,cmd('lobby.ready',{ready:true}));await sync(0,cmd('round.start'));await new Promise(r=>setTimeout(r,80));
  const views=await Promise.all(guests.map((_,i)=>sync(i)));const rid=views[0].snapshot.room.roundId;assert.equal(views[0].snapshot.room.phase,'investigation');
  lock=await pool.connect();await lock.query('BEGIN');await lock.query('SELECT state FROM game_private.hosted_world WHERE id=1 FOR UPDATE');
  const start=Date.now();const polled=await sync(0);assert.ok(Date.now()-start<1500,'A read poll must not wait behind the held world writer');assert.equal(polled.snapshot.self.id,views[0].snapshot.self.id);assert.ok(!('culprit'in polled.snapshot.room));
  const invalid=await sync(0,cmd('input.move',{x:999,z:0},rid));assert.equal(invalid.response.code,'INVALID_PAYLOAD');
  const coalesced=await sync(0,cmd('input.move',{x:1,z:0},rid));assert.equal(coalesced.response.coalesced,true);
  const agent=views.findIndex(v=>v.snapshot.self.role==='agent');let settled=false;
  const sensitive=sync(agent,cmd('sabotage',{ability:'forge',target:'footage'},rid)).then(result=>{settled=true;return result;});
  await new Promise(r=>setTimeout(r,150));assert.equal(settled,false,'Sensitive commands must retain the authoritative lock');
  await lock.query('ROLLBACK');lock.release();lock=undefined;assert.equal((await sensitive).response.code,'FORBIDDEN');
 }finally{if(lock){await lock.query('ROLLBACK');lock.release();}await pool.end();}
});
