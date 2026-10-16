import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { Engine, GameError, type Room } from './engine.js';
import type { Command } from '../shared/types.js';

export const hostedSchema = `CREATE SCHEMA IF NOT EXISTS game_private;
REVOKE ALL ON SCHEMA game_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS game_private.hosted_world(id integer PRIMARY KEY CHECK(id=1), state jsonb NOT NULL);
INSERT INTO game_private.hosted_world VALUES(1,'{"rooms":[],"leases":{},"buckets":{},"tick":0,"cleanup":0}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS game_private.hosted_sessions(token_hash text PRIMARY KEY, id uuid NOT NULL UNIQUE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS game_private.hosted_receipts(session_id uuid NOT NULL REFERENCES game_private.hosted_sessions(id) ON DELETE CASCADE, command_id uuid NOT NULL, digest text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(session_id,command_id));
REVOKE ALL ON game_private.hosted_world, game_private.hosted_sessions, game_private.hosted_receipts FROM PUBLIC;`;
interface World {rooms:Room[];leases:Record<string,{controller:string;seen:number}>;buckets:Record<string,{tokens:number;at:number}>;tick:number;cleanup:number}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const commandSchema=z.object({id:z.uuid(),type:z.string().max(40),roundId:z.string().nullable().optional(),payload:z.record(z.string(),z.unknown()).optional()}).strict();
export const requestSchema=z.object({controller:z.uuid(),claim:z.boolean().optional(),command:commandSchema.optional()}).strict();
type RequestData=z.infer<typeof requestSchema>;
export class HostedGame {
 constructor(private pool:Pool,private makeEngine=()=>new Engine(undefined,1000)){}
 private async transaction<T>(fn:(c:PoolClient,w:World,e:Engine,now:number)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();try{await c.query('BEGIN');
   const row=await c.query('SELECT state FROM game_private.hosted_world WHERE id=1 FOR UPDATE');
   if(!row.rows[0])throw Error('Hosted schema has not been migrated.');
   const w=row.rows[0].state as World;const e=this.makeEngine();e.rooms=new Map(w.rooms.map(r=>[r.code,r]));
   // Database time is authoritative across all function instances.
   const clock=await c.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::float8 AS now');const now=Number(clock.rows[0].now);
   const result=await fn(c,w,e,now);w.rooms=[...e.rooms.values()];
   for(const [key,b]of Object.entries(w.buckets))if(now-b.at>600000)delete w.buckets[key];
   for(const [key,l]of Object.entries(w.leases))if(now-l.seen>1800000)delete w.leases[key];
   if(now-w.cleanup>3600000){await c.query('DELETE FROM game_private.hosted_sessions WHERE expires_at<now()');w.cleanup=now;}
   await c.query('UPDATE game_private.hosted_world SET state=$1 WHERE id=1',[JSON.stringify(w)]);await c.query('COMMIT');return result;
  }catch(err){await c.query('ROLLBACK');throw err;}finally{c.release();}
 }
 private rate(w:World,key:string,limit:number,period:number,now:number){const b=w.buckets[key]??{tokens:limit,at:now};b.tokens=Math.min(limit,b.tokens+(now-b.at)*limit/period);b.at=now;w.buckets[key]=b;if(b.tokens<1)return false;b.tokens--;return true;}
 async session(token:string|undefined,ip:string){return this.transaction(async(c,w,_e,now)=>{
  if(token&&token.length===43){const existing=await c.query('SELECT id FROM game_private.hosted_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)]);if(existing.rows.length)return {created:false,token};}
  if(!this.rate(w,'guest:'+hash(ip),20,60000,now))return {error:'Too many guest sessions. Please wait.'};
  const fresh=randomBytes(32).toString('base64url');await c.query("INSERT INTO game_private.hosted_sessions VALUES($1,$2,now()+interval '24 hours')",[hash(fresh),randomUUID()]);return {created:true,token:fresh};
 });}
 private advance(w:World,e:Engine,now:number){
  for(const r of e.rooms.values())for(const p of r.players){const lease=w.leases[p.session];const connected=!!lease&&now-lease.seen<15000;if(p.connected!==connected)e.connected(p.session,connected,lease?.seen??now);}
  // Integrate bounded movement in small steps; never let several instances advance the same time twice.
  if(!w.tick)w.tick=now;const end=Math.min(now,w.tick+500);
  while(w.tick+50<=end){w.tick+=50;e.tick(w.tick,.05);}
  if(now-w.tick>500){e.tick(now,0);w.tick=now;}
 }
 async sync(token:string|undefined,data:RequestData){return this.transaction(async(c,w,e,now)=>{
  if(!token||token.length!==43)throw new GameError('SESSION_EXPIRED','Reload to establish a guest session.');
  const session=(await c.query('SELECT id FROM game_private.hosted_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)])).rows[0];
  if(!session)throw new GameError('SESSION_EXPIRED','Reload to establish a guest session.');const sid:string=session.id;
  if(!this.rate(w,sid+':ingress',24,1000,now))return {type:'error',id:data.command?.id,code:'RATE_LIMIT',message:'Please slow down.'};
  const lease=w.leases[sid];if(lease&&lease.controller!==data.controller&&!data.claim)return {type:'error',code:'SESSION_REPLACED',message:'This guest session is open in another tab. Use another browser profile for a second player.'};
  this.advance(w,e,now);w.leases[sid]={controller:data.controller,seen:now};const room=e.locate(sid);if(room&&!e.member(room,sid).connected)e.connected(sid,true,now);
  let response:unknown=null;const cmd=data.command as Command|undefined;
  if(cmd){try{
   const bucket=['chat','quick'].includes(cmd.type)?'chat':cmd.type==='evidence.compare'?'compare':cmd.type==='input.move'?'move':'action';
   const [limit,period]=({chat:[4,10000],compare:[2,10000],move:[15,1000],action:[10,1000]})[bucket];
   if(!this.rate(w,sid+':'+bucket,limit,period,now))throw new GameError('RATE_LIMIT','Please slow down.');
   const digest=hash(JSON.stringify(cmd));const movement=cmd.type==='input.move';
   const old=movement?null:(await c.query('SELECT digest,response FROM game_private.hosted_receipts WHERE session_id=$1 AND command_id=$2',[sid,cmd.id])).rows[0];
   if(old){if(old.digest!==digest)throw new GameError('REPLAY_MISMATCH','Command identifier was reused.');response=old.response;}
   else{
    if(cmd.type==='room.create'&&!this.rate(w,sid+':create',5,600000,now))throw new GameError('RATE_LIMIT','Too many missions created.');
    if(cmd.type==='room.join'&&!this.rate(w,sid+':join',10,60000,now))throw new GameError('RATE_LIMIT','Too many join attempts.');
    const backup=structuredClone([...e.rooms.entries()]);try{e.command(sid,cmd,now);}catch(err){e.rooms=new Map(backup);throw err;}
    response={type:'ack',id:cmd.id};if(!movement)await c.query('INSERT INTO game_private.hosted_receipts(session_id,command_id,digest,response) VALUES($1,$2,$3,$4)',[sid,cmd.id,digest,JSON.stringify(response)]);
   }
  }catch(err){if(!(err instanceof GameError))throw err;response={type:'error',id:cmd.id,code:err.code,message:err.message};}}
  return {snapshot:e.snapshot(sid,now),response};
 });}
}
