import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store';
import { Engine } from '../server/engine';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('fresh local installs create their nested database directory automatically',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aegis-store-'));const store=new Store('file:'+join(dir,'new','database'));
 try{await store.migrate();await store.check();}finally{await store.close();await rm(dir,{recursive:true,force:true});}
});
test('PostgreSQL schema persists rooms and hashed sessions; duplicate receipts are atomic',async()=>{
 const store=new Store('memory:');try{await store.migrate();await store.check();const sid=randomUUID();await store.newSession(sid,'a'.repeat(64));assert.equal((await store.session('a'.repeat(64)))?.id,sid);assert.equal(await store.session('wrong'),undefined);const e=new Engine();e.command(sid,{id:randomUUID(),type:'room.create',payload:{name:'Operator',mode:'coop'}});const rooms=[...e.rooms.values()],id=randomUUID();await store.persist(rooms,{session:sid,id,hash:'payload-one',response:{type:'ack',id}});assert.equal((await store.load())[0].code,rooms[0].code);assert.equal((await store.receipt(sid,id)).payload_hash,'payload-one');rooms[0].players[0].score=999;await assert.rejects(store.persist(rooms,{session:sid,id,hash:'payload-two',response:{type:'ack',id}}));assert.equal((await store.load())[0].players[0].score,0);await store.persist([]);assert.deepEqual(await store.load(),[]);}finally{await store.close();}
});
