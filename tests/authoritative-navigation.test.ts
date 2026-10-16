import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Engine, GameError, defaultTiming } from '../server/engine';
import { STATIONS, distance, walkable } from '../shared/world';

test('server routes reach every console without streamed steering or position jumps',()=>{
 const engine=new Engine({...defaultTiming,reveal:0,investigation:600000});const sessions=[randomUUID(),randomUUID(),randomUUID()];let now=1_000_000;
 const command=(index:number,type:string,payload:Record<string,unknown>={})=>engine.command(sessions[index],{id:randomUUID(),type,payload,roundId:engine.locate(sessions[index])?.round?.id},now);
 command(0,'room.create',{name:'Route One',mode:'social'});const room=engine.locate(sessions[0])!;command(1,'room.join',{name:'Route Two',code:room.code});command(2,'room.join',{name:'Route Three',code:room.code});command(0,'lobby.ready',{ready:true});command(1,'lobby.ready',{ready:true});command(2,'lobby.ready',{ready:true});command(0,'round.start');engine.tick(++now,.05);
 const player=room.players[0];
 for(const id of ['footage','clock','verify-a','repair-uplink','reader','event','board','manifest','frame','verify-b','repair-reactor','abort-b']){
  const station=STATIONS.find(s=>s.id===id)!;const destination={x:station.x,z:station.z+(id==='board'?0:.8)};
  command(0,'move.to',destination);let ticks=0;
  while(player.route?.length&&ticks++<800){const before={x:player.x,z:player.z};now+=50;engine.tick(now,.05);assert.ok(walkable(player));assert.ok(distance(before,player)<=.26001,'authoritative speed limit');}
  assert.ok(ticks<800,'route stalled at '+id);assert.ok(distance(player,destination)<.08,'precise endpoint '+id);assert.ok(distance(player,station)<2.65,'interaction range '+id);
 }
 command(0,'move.to',{x:0,z:-3});command(0,'input.move',{x:1,z:0});assert.equal(player.route?.length,0,'direct input overrides a route');
 command(0,'move.to',{x:0,z:-3});command(0,'move.cancel');assert.equal(player.route?.length,0);assert.equal(player.dx,0);
 assert.throws(()=>command(0,'move.to',{x:0,z:0}),(err:unknown)=>err instanceof GameError&&err.code==='INVALID_DESTINATION');
 assert.throws(()=>command(0,'move.to',{x:999,z:999}),(err:unknown)=>err instanceof GameError&&err.code==='INVALID_PAYLOAD');
 command(0,'move.to',{x:0,z:-3});engine.connected(sessions[0],false,now);assert.equal(player.route?.length,0,'disconnect stops navigation');
});
