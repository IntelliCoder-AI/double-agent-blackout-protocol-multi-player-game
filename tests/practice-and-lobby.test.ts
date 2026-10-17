import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Engine, GameError } from '../server/engine';
import { caseTruth } from '../server/case';
import { MISSIONS } from '../shared/missions';
import { STATIONS, distance } from '../shared/world';
import { seatCookie, validSeat } from '../shared/seat';

test('empty lobbies keep their invite, accept a new host, and expire after 30 idle minutes',()=>{
 const e=new Engine(),a=randomUUID(),b=randomUUID();let now=1000000;
 const cmd=(sid:string,type:string,payload={})=>e.command(sid,{id:randomUUID(),type,payload},now);
 cmd(a,'room.create',{name:'First',mode:'coop'});const code=e.locate(a)!.code;
 cmd(a,'room.leave');assert.ok(e.rooms.has(code));assert.equal(e.rooms.get(code)!.players.length,0);
 now+=60000;cmd(b,'room.join',{name:'Returning',code});assert.equal(e.locate(b)!.hostId,e.locate(b)!.players[0].id);
 cmd(b,'room.leave');now+=1800001;e.tick(now);assert.ok(!e.rooms.has(code));
 assert.throws(()=>cmd(a,'room.join',{name:'Expired',code}),e=>e instanceof GameError&&e.code==='NOT_FOUND');
});

test('callsigns can change in a lobby, reject duplicates, and stay fixed in a live round',()=>{
 const e=new Engine(),a=randomUUID(),b=randomUUID();const cmd=(sid:string,type:string,payload={})=>e.command(sid,{id:randomUUID(),type,payload},1000000);
 cmd(a,'room.create',{name:'First',mode:'coop'});cmd(b,'room.join',{name:'Second',code:e.locate(a)!.code});
 cmd(a,'lobby.name',{name:'New Cipher'});assert.equal(e.snapshot(a).room!.players[0].name,'New Cipher');
 assert.throws(()=>cmd(b,'lobby.name',{name:'new cipher'}));for(const sid of [a,b])cmd(sid,'lobby.ready',{ready:true});cmd(a,'round.start');
 assert.throws(()=>cmd(a,'lobby.name',{name:'During round'}));
});

test('practice companion traverses real routes, publishes its assigned evidence, votes from the wall and rematches in every case',()=>{
 for(const mission of MISSIONS){
  const e=new Engine(),human=randomUUID();let now=1000000;
  const cmd=(type:string,payload:Record<string,unknown>={})=>e.command(human,{id:randomUUID(),type,payload,roundId:e.locate(human)?.round?.id},now);
  cmd('room.create',{name:'Solo Reviewer',mode:'practice'});const r=e.locate(human)!,code=r.code,h=r.players[0],bot=r.players[1];
  assert.ok(bot.bot&&bot.ready);assert.throws(()=>e.command(randomUUID(),{id:randomUUID(),type:'room.join',payload:{name:'Intruder',code}},now));
  cmd('lobby.case',{caseId:mission.id});assert.ok(bot.ready);cmd('lobby.ready',{ready:true});cmd('round.start');
  const step=(ms:number)=>{for(let n=0;n<ms;n+=50){now+=Math.min(50,ms-n);e.tick(now,Math.min(50,ms-n)/1000);}};
  step(8050);assert.equal(r.round!.phase,'investigation');assert.equal(e.snapshot(human).self!.role,'agent');
  assert.throws(()=>cmd('practice.discuss'));const grants=e.snapshot(human).self!.grants;
  const go=(id:string)=>{const s=STATIONS.find(s=>s.id===id)!;cmd('move.to',{x:s.x,z:s.z+.8});let tries=0;while(h.route?.length&&tries++<1500)step(50);assert.ok(distance(h,s)<=2.65,id);};
  go('repair-uplink');for(const [i,value]of [2,0,1].entries()){cmd('repair.step',{station:'repair-uplink',step:i,value});step(950);}
  for(const id of grants){go(id);cmd('interact',{station:id});step(2600);go('verify-a');for(let retry=0;retry<3&&!r.round!.evidence.find(x=>x.id===id)!.verified;retry++){step(Math.max(0,(r.round!.jammed['verify-a']??0)-now)+50);cmd('interact',{station:'verify-a',evidence:id});step(6100);}assert.ok(r.round!.evidence.find(x=>x.id===id)!.verified);go('board');if(!r.round!.evidence.find(x=>x.id===id)!.sharedBy)cmd('evidence.share',{evidence:id});}
  let ticks=0;while(r.round!.evidence.some(c=>!c.verified||!c.sharedBy)&&ticks++<2000)step(50);
  assert.equal(r.round!.evidence.filter(c=>c.verified&&c.sharedBy).length,6,mission.id);
  assert.ok(r.round!.evidence.some(c=>c.sharedBy===bot.id));assert.ok(r.round!.evidence.some(c=>c.discoveredBy.includes(bot.id)));
  go('board');const truth=caseTruth(mission.id);cmd('evidence.compare',{from:'clock',to:'footage',relation:'corrected-time',value:truth.normalized});cmd('evidence.compare',{from:'event',to:'reader',relation:'same-event',value:truth.event});
  cmd('practice.discuss');step(15100);assert.equal(r.round!.phase,'vote');
  const camera=r.round!.evidence.find(c=>c.id==='footage')!,reader=r.round!.evidence.find(c=>c.id==='reader')!;
  const suspect=camera.candidates!.filter(id=>reader.candidates!.includes(id));assert.equal(suspect.length,1);
  cmd('vote',{target:suspect[0],evidence:'footage'});step(30500);assert.equal(r.round!.result?.winner,'agents',mission.id);
  assert.ok(r.players.every(p=>p.score===0));cmd('round.rematch');assert.equal(r.code,code);assert.ok(bot.ready);assert.ok(!h.ready);
  cmd('room.leave');assert.ok(!e.rooms.has(code));
 }
});

test('bot ballots abstain without published authenticated identifying evidence, never use the hidden culprit',()=>{
 const e=new Engine(),sid=randomUUID();let now=1000000;
 const cmd=(type:string,payload={})=>e.command(sid,{id:randomUUID(),type,payload},now);
 cmd('room.create',{name:'Reviewer',mode:'practice'});const r=e.locate(sid)!;cmd('lobby.ready',{ready:true});cmd('round.start');
 const t=r.round!,bot=r.players.find(p=>p.bot)!;t.phase='vote';t.deadline=now+30000;
 e.tick(now+1000);assert.deepEqual(t.votes[bot.id],{target:null,evidence:undefined});
 delete t.votes[bot.id];const a=t.evidence.find(c=>c.id==='footage')!,b=t.evidence.find(c=>c.id==='reader')!;
 a.verified=b.verified=true;a.sharedBy=b.sharedBy=r.players[0].id;const proven=a.candidates!.find(id=>b.candidates!.includes(id))!;
 t.culprit='deliberately-wrong-hidden-value';e.tick(now+2000);assert.equal(t.votes[bot.id].target,proven);
 e.connected(sid,false,now+2000);e.tick(now+20000);assert.equal(r.hostId,r.players[0].id);
});

test('seat namespaces validate UUIDs and never substitute for guest credentials',()=>{
 const a=randomUUID(),b=randomUUID();assert.ok(validSeat(a));assert.notEqual(seatCookie(true,a),seatCookie(true,b));assert.equal(seatCookie(true),'__Host-doubleagent');
 for(const bad of ['../a','a; token=x','',undefined])assert.equal(validSeat(bad),false);
 assert.throws(()=>seatCookie(true,'not-a-uuid'));
});

test('abandoned bot lobbies neither consume human capacity nor prevent room expiry',()=>{
 const e=new Engine(),now=1000000;
 for(let n=0;n<6;n++){const sid=randomUUID();e.command(sid,{id:randomUUID(),type:'room.create',payload:{name:'Practice '+n,mode:'practice'}},now);const r=e.locate(sid)!;e.connected(sid,false,now);assert.ok(r.players.find(p=>p.bot)!.connected);}
 assert.equal(e.rooms.size,6);e.tick(now+1800001);assert.equal(e.rooms.size,0);
});
