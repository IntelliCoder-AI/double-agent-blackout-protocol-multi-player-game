import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Room } from './engine.js';
import { PGlite } from '@electric-sql/pglite';
export class Store {
  pool:pg.Pool; embedded:PGlite|null=null; owner:pg.PoolClient|null=null;
  constructor(url:string){
    if(url.startsWith('file:')||url==='memory:'){
      if(url.startsWith('file:'))mkdirSync(resolve(url.slice(5)),{recursive:true});
      this.embedded=new PGlite(url==='memory:'?undefined:url.slice(5));const db=this.embedded;
      this.pool={query:(sql:string,params?:unknown[])=>db.query(sql,params),connect:async()=>({query:(sql:string,params?:unknown[])=>db.query(sql,params),release:()=>{}}),end:()=>db.close()} as unknown as pg.Pool;
    }else this.pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,statement_timeout:5000});
  }
  async migrate(){const sql=await readFile(resolve('server/migrations/001_initial.sql'),'utf8');if(this.embedded)await this.embedded.exec(sql);else await this.pool.query(sql);}
  async check(){await this.pool.query('SELECT 1 FROM game_private.rooms LIMIT 1');}
  async claimOwnership(){if(this.embedded)return;this.owner=await this.pool.connect();const result=await this.owner.query('SELECT pg_try_advisory_lock(2089,401) AS acquired');if(!result.rows[0].acquired){this.owner.release();this.owner=null;throw Error('Another game server owns this database. Stop the previous instance before starting a replacement.');}}
  async load():Promise<Room[]>{return (await this.pool.query('SELECT snapshot FROM game_private.rooms')).rows.map(r=>r.snapshot);}
  async session(hash:string){return (await this.pool.query('SELECT id, expires_at FROM game_private.sessions WHERE token_hash=$1 AND expires_at>now()',[hash])).rows[0] as {id:string;expires_at:Date}|undefined;}
  async newSession(id:string,hash:string){await this.pool.query("INSERT INTO game_private.sessions(id,token_hash,expires_at) VALUES($1,$2,now()+interval '24 hours')",[id,hash]);}
  async receipt(session:string,id:string){return (await this.pool.query('SELECT payload_hash,response FROM game_private.command_receipts WHERE session_id=$1 AND command_id=$2',[session,id])).rows[0];}
  async persist(rooms:Room[],receipt?:{session:string;id:string;hash:string;response:unknown}){
    const c=await this.pool.connect();try{await c.query('BEGIN');
      for(const room of rooms)await c.query('INSERT INTO game_private.rooms(code,snapshot) VALUES($1,$2) ON CONFLICT(code) DO UPDATE SET snapshot=excluded.snapshot,updated_at=now()',[room.code,JSON.stringify(room)]);
      await c.query('DELETE FROM game_private.rooms WHERE NOT(code=ANY($1::text[]))',[rooms.map(r=>r.code)]);
      if(receipt)await c.query('INSERT INTO game_private.command_receipts(session_id,command_id,payload_hash,response) VALUES($1,$2,$3,$4)',[receipt.session,receipt.id,receipt.hash,JSON.stringify(receipt.response)]);
      await c.query('COMMIT');
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  async cleanup(){await this.pool.query("DELETE FROM game_private.command_receipts WHERE created_at<now()-interval '24 hours'");await this.pool.query('DELETE FROM game_private.sessions WHERE expires_at<now()');}
  async close(){if(this.owner){await this.owner.query('SELECT pg_advisory_unlock(2089,401)');this.owner.release();this.owner=null;}await this.pool.end();}
}
