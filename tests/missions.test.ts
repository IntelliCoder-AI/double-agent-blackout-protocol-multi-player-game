import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MISSIONS} from '../shared/missions';
import {makeCase,caseTruth} from '../server/case';
import {Engine,defaultTiming,GameError} from '../server/engine';
import {STATIONS} from '../shared/world';

test('all five handcrafted cases retain exactly one provable culprit across 2–8 players',()=>{
 for(const mission of MISSIONS)for(let count=2;count<=8;count++)for(let seed=0;seed<60;seed++){
  const players=Array.from({length:count},(_,i)=>`p${i}`),suspects=count===2?['mira','orin','tessa']:players,culprit=suspects[seed%suspects.length];
  const evidence=makeCase(suspects,culprit,players,mission.id),camera=evidence.find(e=>e.id==='footage')!,reader=evidence.find(e=>e.id==='reader')!;
  assert.deepEqual(camera.candidates!.filter(id=>reader.candidates!.includes(id)),[culprit]);
  assert.notEqual(camera.grantedTo,reader.grantedTo);assert.equal(evidence.length,6);assert.equal(new Set(evidence.map(e=>e.id)).size,6);
  assert.notEqual(caseTruth(mission.id).exported,camera.canonical);assert.ok(evidence.every(e=>players.includes(e.grantedTo)));
 }
});
test('the signed reconstruction puzzles have independently checked solutions',()=>{
 assert.equal(2*3600+15*60+30-90,2*3600+14*60);assert.equal(caseTruth('ghost').normalized,'02:14:00');
 assert.equal([...caseTruth('mirror').exported].reverse().join(''),caseTruth('mirror').normalized);
 assert.equal(caseTruth('relay').normalized,'03:06:00');assert.equal(5*3600+6*60-2*3600,3*3600+6*60);
 assert.equal('SEQ-'+String(42+3).padStart(3,'0'),caseTruth('cold').normalized);
 assert.equal((40-90+86400)%86400,23*3600+59*60+10);assert.equal(caseTruth('midnight').normalized,'23:59:10');
});
test('forgery in every case preserves immutable counter-evidence and records exposure in debrief metrics',()=>{
 for(const mission of MISSIONS){
  const e=new Engine({...defaultTiming,reveal:1});let now=100000;const sessions=[randomUUID(),randomUUID(),randomUUID()];
  const command=(i:number,type:string,payload:Record<string,unknown>={})=>e.command(sessions[i],{id:randomUUID(),type,payload,roundId:e.locate(sessions[i])?.round?.id},now);
  command(0,'room.create',{name:'Host',mode:'social'});const r=e.locate(sessions[0])!;for(let i=1;i<3;i++)command(i,'room.join',{name:'Agent '+i,code:r.code});command(0,'lobby.case',{caseId:mission.id});sessions.forEach((_,i)=>command(i,'lobby.ready',{ready:true}));command(0,'round.start');e.tick(now+=2);
  const t=r.round!,traitor=r.players.findIndex(p=>t.roles[p.id]==='traitor'),agent=(traitor+1)%3,footage=t.evidence.find(e=>e.id==='footage')!,receipt=t.evidence.find(e=>e.id==='clock')!,frame=t.evidence.find(e=>e.id==='frame')!;
  const originalReceipt=receipt.canonical,originalFrame=frame.canonical;const at=(i:number,id:string)=>{const s=STATIONS.find(s=>s.id===id)!;r.players[i].x=s.x;r.players[i].z=s.z;};
  at(traitor,'footage');command(traitor,'sabotage',{ability:'forge',target:'footage'});e.tick(now+=2001);assert.notEqual(footage.observed,footage.canonical);assert.equal(receipt.canonical,originalReceipt);assert.equal(frame.canonical,originalFrame);
  footage.sharedBy=r.players[traitor].id;at(agent,'verify-a');command(agent,'interact',{station:'verify-a',evidence:'footage'});e.tick(now+=6001);
  const publicCard=e.snapshot(sessions[agent],now).room!.board[0];assert.ok(publicCard.discrepancy);assert.equal(publicCard.value,footage.canonical);e.finish(r,'agents','Verified forgery',now);assert.equal(t.result!.metrics!.forgeriesExposed,1);assert.equal(t.result!.metrics!.sabotageActions,1);
 }
});
test('host case selection, full command-driven solutions, ballots and repeated rematches work for every case',()=>{
 const e=new Engine({...defaultTiming,reveal:1,investigation:10000,scan:1,verify:1,discussion:1,vote:1});let now=100000;
 const sessions=[randomUUID(),randomUUID()];const command=(i:number,type:string,payload:Record<string,unknown>={})=>e.command(sessions[i],{id:randomUUID(),type,payload,roundId:e.locate(sessions[i])?.round?.id},now);
 command(0,'room.create',{name:'Cipher',mode:'coop'});const room=e.locate(sessions[0])!;command(1,'room.join',{name:'Echo',code:room.code});
 const at=(i:number,id:string)=>{const s=STATIONS.find(s=>s.id===id)!;room.players[i].x=s.x;room.players[i].z=s.z;};
 for(const mission of MISSIONS){
  assert.throws(()=>command(1,'lobby.case',{caseId:mission.id}),(err:unknown)=>err instanceof GameError&&err.code==='FORBIDDEN');
  command(0,'lobby.ready',{ready:true});command(0,'lobby.case',{caseId:mission.id});assert.ok(room.players.every(p=>!p.ready));
  sessions.forEach((_,i)=>command(i,'lobby.ready',{ready:true}));command(0,'round.start');e.tick(now+=2);
  assert.equal(e.snapshot(sessions[1],now).room!.mission.id,mission.id);assert.throws(()=>command(0,'lobby.case',{caseId:'ghost'}));
  for(const evidence of room.round!.evidence){const holder=room.players.findIndex(p=>p.id===evidence.grantedTo);at(holder,evidence.id);command(holder,'interact',{station:evidence.id});e.tick(now+=2);at(holder,'verify-a');command(holder,'interact',{station:'verify-a',evidence:evidence.id});e.tick(now+=2);at(holder,'board');command(holder,'evidence.share',{evidence:evidence.id});}
  at(0,'board');const truth=caseTruth(mission.id);
  assert.throws(()=>command(0,'evidence.compare',{from:'clock',to:'footage',relation:'corrected-time',value:'UNSUPPORTED'}));
  command(0,'evidence.compare',{from:'clock',to:'footage',relation:'corrected-time',value:truth.normalized});command(0,'evidence.compare',{from:'event',to:'reader',relation:'same-event',value:truth.event});
  assert.equal(room.round!.links.length,2);const published=e.snapshot(sessions[0],now).room!.board;
  const camera=published.find(c=>c.id==='footage')!,reader=published.find(c=>c.id==='reader')!,culprit=camera.candidates!.find(id=>reader.candidates!.includes(id))!;
  now=room.round!.deadline+1;e.tick(now);now=room.round!.deadline+1;e.tick(now);assert.equal(room.round!.phase,'vote');
  sessions.forEach((_,i)=>command(i,'vote',{target:culprit,evidence:'footage'}));e.tick(now=room.round!.deadline+1);assert.equal(room.round!.result!.winner,'agents');assert.equal(room.round!.result!.metrics!.sharedRecords,6);assert.equal(room.round!.result!.metrics!.supportedConnections,2);assert.equal(room.round!.result!.metrics!.contributions.reduce((sum,p)=>sum+p.recovered,0),6);command(0,'round.rematch');assert.equal(room.round,null);
 }
 assert.equal(room.roundNumber,5);assert.equal(room.players[0].score,500);
});
