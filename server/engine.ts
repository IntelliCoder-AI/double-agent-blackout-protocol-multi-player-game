import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { COLORS, STATIONS, distance, move, roomAt, type Point } from '../shared/world.js';
import type { ClueView, Command, LinkView, Mode, Phase, ResultView, Role, Snapshot } from '../shared/types.js';
import { clueView, makeCase, type Evidence } from './case.js';

export class GameError extends Error { constructor(public code:string, message:string){super(message);} }
function need(condition:unknown,message:string,code='INVALID_ACTION'):asserts condition {if(!condition)throw new GameError(code,message);}
const empty=z.object({}).strict();
const schemas:Record<string,z.ZodType>={
  'room.create':z.object({name:z.string().trim().min(2).max(20),mode:z.enum(['social','coop'])}).strict(),
  'room.join':z.object({name:z.string().trim().min(2).max(20),code:z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/)}).strict(),
  'room.leave':empty,'lobby.ready':z.object({ready:z.boolean()}).strict(),'round.start':empty,'round.rematch':empty,
  'appearance':z.object({color:z.enum(COLORS as [string,...string[]])}).strict(),
  'input.move':z.object({x:z.number().min(-1).max(1),z:z.number().min(-1).max(1)}).strict(),
  'interact':z.object({station:z.string().max(30),evidence:z.string().max(30).optional()}).strict(),
  'cancel':empty,'evidence.share':z.object({evidence:z.string().max(30)}).strict(),
  'evidence.compare':z.object({from:z.string().max(30),to:z.string().max(30),relation:z.enum(['corrected-time','same-event']),value:z.string().max(60)}).strict(),
  'repair.step':z.object({station:z.string().max(30),step:z.number().int().min(0).max(2),value:z.number().int().min(0).max(9)}).strict(),
  'sabotage':z.object({ability:z.enum(['forge','jam','delay','exfil']),target:z.string().max(30)}).strict(),
  'vote':z.object({target:z.string().max(50).nullable(),evidence:z.string().max(30).optional()}).strict(),
  'chat':z.object({text:z.string().trim().min(1).max(280)}).strict(),
  'quick':z.object({key:z.enum(['found','verify','help','conflict','abort']),reference:z.string().max(30).optional()}).strict(),
};
export interface Player extends Point { id:string; session:string; name:string;color:string;ready:boolean;connected:boolean;lastSeen:number;score:number;dx:number;dz:number;inputAt:number }
interface Channel {kind:'scan'|'verify'|'abort'|'forge'|'jam'|'delay'|'exfil';target:string;station:string;endsAt:number;startedAt:number}
export interface Round {
  id:string;phase:Phase;deadline:number;startedAt:number;investigationAt:number;culprit:string;roles:Record<string,Role>;
  evidence:Evidence[];links:LinkView[];repairs:Record<string,{step:number;complete:boolean;jammedUntil:number;lastStepAt:number}>;
  channels:Record<string,Channel>;charges:Record<string,number>;cooldowns:Record<string,number>;used:Record<string,string[]>;
  jammed:Record<string,number>;votes:Record<string,{target:string|null;evidence?:string}>;runoffTargets:string[];
  exfil:{endsAt:number}|null;dossier:boolean;result:ResultView|null;timeline:{text:string;at:number}[];
  pauseAt:number|null;pauseSpent:number;voteGrace:boolean;npcNext:number;
}
export interface Room {code:string;mode:Mode;hostId:string;players:Player[];round:Round|null;chat:{id:string;name:string;text:string;at:number}[];roundNumber:number;updatedAt:number;createdAt:number}
export const defaultTiming={reveal:8000,investigation:270000,discussion:45000,vote:30000,runoff:15000,scan:2500,verify:6000,escrow:120000,exfilStart:90000,exfil:40000};
export class Engine {
  rooms=new Map<string,Room>(); inputs=new Map<string,number>();
  constructor(public timing={...defaultTiming}){}
  locate(session:string){return [...this.rooms.values()].find(r=>r.players.some(p=>p.session===session));}
  member(r:Room,session:string){const p=r.players.find(p=>p.session===session);need(p,'Join a mission first.','NOT_MEMBER');return p;}
  connected(session:string,online:boolean,now=Date.now()) {const r=this.locate(session);if(!r)return;const p=this.member(r,session);p.connected=online;p.lastSeen=now;p.dx=0;p.dz=0;r.updatedAt=now;}
  elapsed(round:Round,now:number){return round.investigationAt?Math.max(0,(round.pauseAt??now)-round.investigationAt):0;}
  quorum(r:Room){return r.mode==='coop'?2:Math.max(2,Math.ceil(r.players.length/2));}
  near(p:Point,id:string){const s=STATIONS.find(x=>x.id===id);need(s&&distance(p,s)<=2.65,'Move closer to that station.','TOO_FAR');return s;}
  live(r:Room,p:Player,now:number){const t=r.round;need(t&&t.phase==='investigation','Investigation is not active.','WRONG_PHASE');need(!t.pauseAt,'Waiting for agents to reconnect.','PAUSED');need(now<t.deadline,'The investigation has ended.');return t;}
  log(t:Round,text:string,now:number){t.timeline.push({text,at:now});if(t.timeline.length>60)t.timeline.shift();}
  command(session:string,c:Command,now=Date.now()):Room|null {
    const schema=schemas[c.type];need(schema,'Unknown command.');const parsed=schema.safeParse(c.payload??{});need(parsed.success,'Invalid request.','INVALID_PAYLOAD');const a=parsed.data as any;
    if(c.type==='room.create'||c.type==='room.join'){
      need(!this.locate(session),'Leave your current mission first.');
      let r:Room;
      if(c.type==='room.create'){
        need(this.rooms.size<Number(process.env.MAX_ACTIVE_ROOMS??5),'Headquarters is at capacity. Try again shortly.','CAPACITY');
        const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code='';do{code=Array.from(randomBytes(6),b=>alphabet[b%32]).join('');}while(this.rooms.has(code));
        r={code,mode:a.mode,hostId:'',players:[],round:null,chat:[],roundNumber:0,createdAt:now,updatedAt:now};this.rooms.set(code,r);
      }else{const found=this.rooms.get(a.code);need(found,'Mission not found. Check the code.','NOT_FOUND');r=found;need(!r.round,'This mission is underway. Join after the rematch.','STARTED');}
      need(r.players.length<(r.mode==='coop'?2:8),'This mission is full.','FULL');
      const id=randomUUID();const name=r.players.some(p=>p.name.toLowerCase()===a.name.toLowerCase())?`${a.name.slice(0,16)} ${r.players.length+1}`:a.name;
      r.players.push({id,session,name,color:COLORS[r.players.length],ready:false,connected:true,lastSeen:now,score:0,x:-3+r.players.length*.8,z:3.5,dx:0,dz:0,inputAt:0});
      if(!r.hostId)r.hostId=id;r.updatedAt=now;return r;
    }
    const r=this.locate(session);need(r,'Join a mission first.','NOT_MEMBER');const p=this.member(r,session);
    if(c.type==='room.leave'){need(!r.round||r.round.phase==='results','A live mission keeps your seat for reconnection.');r.players=r.players.filter(x=>x.id!==p.id);if(r.hostId===p.id)r.hostId=r.players[0]?.id??'';if(!r.players.length)this.rooms.delete(r.code);return null;}
    if(c.type==='lobby.ready'){need(!r.round,'Readiness is available in the lobby.');p.ready=a.ready;}
    else if(c.type==='appearance'){need(!r.round,'Change your appearance in the lobby.');p.color=a.color;}
    else if(c.type==='round.start'){
      need(p.id===r.hostId,'Only the mission host can start.','FORBIDDEN');need(!r.round,'Mission already started.');need(r.players.length>=(r.mode==='coop'?2:3),'More agents are needed.');need(r.players.every(p=>p.connected&&p.ready),'Every agent must be connected and ready.');
      const ids=r.players.map(p=>p.id),suspects=r.mode==='coop'?['npc-mira','npc-orin','npc-tessa']:ids;const culprit=suspects[randomInt(suspects.length)];
      const t:Round={id:randomUUID(),phase:'reveal',deadline:now+this.timing.reveal,startedAt:now,investigationAt:0,culprit,roles:Object.fromEntries(ids.map(id=>[id,id===culprit?'traitor':'agent'])),evidence:makeCase(suspects,culprit,ids),links:[],repairs:Object.fromEntries(['repair-clock','repair-uplink','repair-reactor'].map(id=>[id,{step:0,complete:false,jammedUntil:0,lastStepAt:0}])),channels:{},charges:Object.fromEntries([...ids,...(r.mode==='coop'?['npc']:[])].map(id=>[id,id==='npc'?3:ids.length<6?4:5])),cooldowns:{},used:{},jammed:{},votes:{},runoffTargets:[],exfil:null,dossier:false,result:null,timeline:[],pauseAt:null,pauseSpent:0,voteGrace:false,npcNext:45000};
      r.round=t;r.roundNumber++;r.chat=[];this.log(t,'AEGIS entered lockdown. The investigation began.',now);
    }else if(c.type==='round.rematch'){
      need(p.id===r.hostId,'Only the host can reopen the lobby.');need(r.round?.phase==='results','Finish this mission first.');r.round=null;r.chat=[];r.players=r.players.filter(p=>p.connected);r.players.forEach((p,i)=>{p.ready=false;p.x=-3+i*.8;p.z=3.5;p.dx=0;p.dz=0;});
    }else if(c.type==='chat'||c.type==='quick'){
      let text=a.text;if(c.type==='quick') {const reference=r.round?.evidence.find(e=>e.id===a.reference&&e.sharedBy);if(['found','verify','conflict'].includes(a.key))need(reference,'Share the evidence before sending this message.');const label=reference?.title??roomAt(p);text=({found:`Found evidence: ${label}`,verify:`Please verify: ${label}`,help:`Need help in ${roomAt(p)}.`,conflict:`Compare the records: ${label}`,abort:'Abort the upload! Use an emergency console.'} as Record<string,string>)[a.key];}r.chat.push({id:randomUUID(),name:p.name,text,at:now});r.chat=r.chat.slice(-60);
    }else{
      const t=r.round;need(t,'The mission has not started.');need(c.roundId===t.id,'This action belongs to an old mission.','STALE_ROUND');
      if(c.type==='input.move'){need(t.phase==='investigation'&&!t.pauseAt,'Movement is paused.','WRONG_PHASE');p.dx=a.x;p.dz=a.z;p.inputAt=now;return r;}
      if(c.type==='vote'){
        need(['vote','runoff'].includes(t.phase)&&now<t.deadline,'Voting is closed.');const ids=r.mode==='coop'?['npc-mira','npc-orin','npc-tessa']:r.players.map(p=>p.id);
        if(a.target!==null){need(ids.includes(a.target),'Invalid suspect.');if(t.phase==='runoff')need(t.runoffTargets.includes(a.target),'Choose a runoff candidate.');need(t.evidence.some(e=>e.id===a.evidence&&e.sharedBy),'Attach a published record from the Evidence Wall.');}
        t.votes[p.id]={target:a.target,evidence:a.evidence};
      }else {
        this.live(r,p,now);
        if(c.type==='cancel'){delete t.channels[p.id];}
        else if(c.type==='interact'){
          const s=this.near(p,a.station);need(!t.channels[p.id],'Finish or cancel your current interaction.');
          if(s.kind==='evidence') {const e=t.evidence.find(e=>e.id===s.id)!;need(e.grantedTo===p.id||this.elapsed(t,now)>=this.timing.escrow,'Your partner has this decryption key. Shared recovery unlocks at 02:00.','LOCKED');need(!e.discoveredBy.includes(p.id)||(!e.sharedBy&&this.elapsed(t,now)>=this.timing.escrow),'Already recovered.');t.channels[p.id]={kind:'scan',target:e.id,station:s.id,endsAt:now+this.timing.scan,startedAt:now};}
          else if(s.kind==='verify'){need((t.jammed[s.id]??0)<=now,'This terminal is jammed. Use the other verifier.');const e=t.evidence.find(e=>e.id===a.evidence);need(e&&(e.discoveredBy.includes(p.id)||e.sharedBy),'Select a discovered record.');need(!e.verified,'This record is already verified.');t.channels[p.id]={kind:'verify',target:e.id,station:s.id,endsAt:now+(t.repairs['repair-clock'].complete?this.timing.verify*2/3:this.timing.verify),startedAt:now};}
          else if(s.kind==='abort'){need(t.exfil,'No upload is active.');t.channels[p.id]={kind:'abort',target:'exfil',station:s.id,endsAt:now+6000,startedAt:now};}
          else throw new GameError('USE_PANEL','Use this station’s interaction panel.');
        }else if(c.type==='evidence.share'){
          this.near(p,'board');const e=t.evidence.find(e=>e.id===a.evidence);need(e&&e.discoveredBy.includes(p.id),'Recover this record first.');need(!e.sharedBy,'This record is already on the wall.');e.sharedBy=p.id;this.log(t,`${p.name} pinned ${e.title}.`,now);
        }else if(c.type==='evidence.compare'){
          this.near(p,'board');const e=t.evidence.find(e=>e.id===a.from),f=t.evidence.find(e=>e.id===a.to);need(e&&f&&e.sharedBy&&f.sharedBy&&e.verified&&f.verified,'Both sources must be shared and verified.');
          const pair=[e.id,f.id].sort().join('|');let label='',explanation='';
          if(pair==='clock|footage'&&a.relation==='corrected-time'){need(a.value==='02:14:00','Subtract the displayed 90-second offset from 02:15:30.');label='Clock corrected';explanation='02:15:30 − 90 seconds = 02:14:00 UTC. The export and clock are now aligned.';}
          else if(pair==='event|reader'&&a.relation==='same-event'){need(a.value==='E-401','Read the event identifiers on both signed records.');label='Same breach event';explanation='Both authenticated records describe E-401. Compare the two access groups to identify the same operator.';}
          else throw new GameError('UNSUPPORTED_COMPARISON','Use the clock/footage or core-bay/access-log comparator.');
          need(!t.links.some(l=>l.id===pair),'This comparison is already supported.');t.links.push({id:pair,from:e.id,to:f.id,label,explanation,author:p.id});
          if(t.links.length===2)t.dossier=true;this.log(t,`${p.name} established: ${label}.`,now);
        }else if(c.type==='repair.step'){
          this.near(p,a.station);const repair=t.repairs[a.station];need(repair&&!repair.complete,'This repair is not available.');need(repair.jammedUntil<=now,'The circuit is temporarily stalled.');need(repair.step===a.step,'The shared puzzle has advanced.');need(now-repair.lastStepAt>=900,'Let the circuit settle.');const answers:Record<string,number[]>={'repair-clock':[1,2,0],'repair-uplink':[2,0,1],'repair-reactor':[2,1,2]};need(a.value===answers[a.station][a.step],'Follow the labeled reference. Try that step again.');repair.step++;repair.lastStepAt=now;
          if(repair.step===3){repair.complete=true;if(a.station==='repair-reactor')t.deadline+=20000;if(a.station==='repair-uplink'||Object.values(t.repairs).filter(x=>x.complete).length>=2)t.exfil=null;this.log(t,`${p.name} completed ${STATIONS.find(s=>s.id===a.station)!.name}.`,now);}
        }else if(c.type==='sabotage'){
          need(t.roles[p.id]==='traitor','Action unavailable.','FORBIDDEN');need(!t.channels[p.id]&&!t.exfil,'Finish the current operation first.');need((t.cooldowns[p.id]??0)<=now,'Sabotage is cooling down.');
          const cost=['forge','exfil'].includes(a.ability)?2:1;need(t.charges[p.id]>=cost,'Not enough charges.');const used=t.used[p.id]??[];let station=a.target;
          if(a.ability==='forge'){need(!used.includes('forge'),'Forgery is limited to once per round.');const e=t.evidence.find(e=>e.id===a.target);need(e&&e.id==='footage'&&!e.verified,'That record cannot be altered.');}
          if(a.ability==='jam'){need(['verify-a','verify-b'].includes(a.target)&&used.filter(x=>x.startsWith('jam:')).length<2&&!used.includes('jam:'+a.target),'Choose an unused verifier.');}
          if(a.ability==='delay'){need(t.repairs[a.target]&&!t.repairs[a.target].complete&&!used.includes('delay'),'That repair cannot be stalled.');}
          if(a.ability==='exfil'){station='exfil';need(this.elapsed(t,now)>=this.timing.exfilStart&&t.deadline-now>=45000&&!used.includes('exfil')&&!t.repairs['repair-uplink'].complete&&Object.values(t.repairs).filter(x=>x.complete).length<2,'Exfiltration is unavailable.');}
          this.near(p,station);t.channels[p.id]={kind:a.ability,target:a.target,station,endsAt:now+(a.ability==='exfil'?3000:2000),startedAt:now};
        }else throw new GameError('INVALID_ACTION','Unknown action.');
      }
    }
    r.updatedAt=now;return r;
  }
  finish(r:Room,winner:ResultView['winner'],reason:string,now:number){const t=r.round!;t.phase='results';t.deadline=now;t.channels={};t.exfil=null;t.pauseAt=null;t.result={winner,reason,culprit:t.culprit,roles:r.players.map(p=>({id:p.id,role:t.roles[p.id]})),forged:t.evidence.filter(e=>e.forged).map(e=>e.id),audit:t.evidence.map(e=>clueView({...e,verified:true})),timeline:[...t.timeline]};for(const p of r.players){p.dx=0;p.dz=0;if(winner==='draw')p.score+=25;else if((winner==='agents'&&t.roles[p.id]==='agent')||(winner==='traitor'&&t.roles[p.id]==='traitor'))p.score+=100;}r.updatedAt=now;}
  tally(r:Room,now:number){const t=r.round!;const ballots=Object.values(t.votes);const counts:Record<string,number>={};for(const b of ballots)if(b.target)counts[b.target]=(counts[b.target]??0)+1;const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const top=sorted[0];const valid=ballots.length>=this.quorum(r)&&top&&top[1]>=2&&(!sorted[1]||top[1]>sorted[1][1]);
    if(valid){this.finish(r,top[0]===t.culprit?'agents':'traitor',top[0]===t.culprit?'The evidence held. The double agent has been exposed.':'The wrong operative was indicted. The double agent escaped.',now);return;}
    if(t.phase==='vote'){t.phase='runoff';t.deadline=now+this.timing.runoff;t.votes={};t.runoffTargets=top&&sorted.filter(x=>x[1]===top[1]).length>1?sorted.filter(x=>x[1]===top[1]).map(x=>x[0]):r.mode==='coop'?['npc-mira','npc-orin','npc-tessa']:r.players.map(p=>p.id);return;}
    const contained=Object.values(t.repairs).filter(x=>x.complete).length>=2;this.finish(r,contained?'draw':'traitor',contained?'The intelligence is secure, but the accusation remained unproven.':'No indictment. The double agent escaped with the intelligence.',now);
  }
  tick(now=Date.now(),dt=.05):boolean {
    let dirty=false;
    for(const r of this.rooms.values()){
      if(now-r.updatedAt>1800000&&!r.players.some(p=>p.connected)){this.rooms.delete(r.code);dirty=true;continue;}
      const host=r.players.find(p=>p.id===r.hostId);if(host&&!host.connected&&now-host.lastSeen>=15000){const next=r.players.find(p=>p.connected);if(next){r.hostId=next.id;dirty=true;}}
      const t=r.round;if(!t||t.phase==='results')continue;
      const connected=r.players.filter(p=>p.connected).length;
      if(t.phase==='investigation'&&connected<this.quorum(r)){
        if(t.pauseAt===null){t.pauseAt=now;dirty=true;}if(t.pauseSpent+now-t.pauseAt>=45000){this.finish(r,'none','Too few agents reconnected. No score awarded.',now);dirty=true;}continue;
      }
      if(t.pauseAt!==null){const pause=now-t.pauseAt;t.pauseSpent+=pause;t.deadline+=pause;t.investigationAt+=pause;for(const c of Object.values(t.channels))c.endsAt+=pause;if(t.exfil)t.exfil.endsAt+=pause;t.pauseAt=null;dirty=true;}
      if(t.phase==='investigation'){
        for(const p of r.players){if(!p.connected||now-p.inputAt>250){p.dx=0;p.dz=0;}const q=move(p,p.dx,p.dz,dt);p.x=q.x;p.z=q.z;
          const c=t.channels[p.id];if(c){const station=STATIONS.find(s=>s.id===c.station)!;if(!p.connected||distance(p,station)>2.65){delete t.channels[p.id];dirty=true;continue;}if(now>=c.endsAt){delete t.channels[p.id];dirty=true;this.completeChannel(r,p,c,now);}}
        }
        if(r.mode==='coop'&&this.elapsed(t,now)>=t.npcNext){
          if(t.npcNext<180000){const e=t.evidence.find(e=>e.id==='footage')!;if(!e.verified&&!e.forged){e.observed='02:15:30 UTC';e.forged=true;this.log(t,'A source export was modified.',now);}else t.jammed['verify-a']=now+10000;t.npcNext=180000;}
          else {if(!t.repairs['repair-uplink'].complete&&Object.values(t.repairs).filter(x=>x.complete).length<2){t.exfil={endsAt:now+this.timing.exfil};this.log(t,'EXFILTRATION DETECTED. The NPC saboteur opened the uplink.',now);}t.npcNext=Number.MAX_SAFE_INTEGER;}dirty=true;
        }
        if(t.exfil&&now>=t.exfil.endsAt){this.finish(r,'traitor','The unopposed uplink completed. Classified intelligence was lost.',now);dirty=true;continue;}
      }
      if(now>=t.deadline){dirty=true;
        if(t.phase==='reveal'){t.phase='investigation';t.investigationAt=now;t.deadline=now+this.timing.investigation;}
        else if(t.phase==='investigation'){t.phase='discussion';t.channels={};t.deadline=now+this.timing.discussion+(t.dossier?15000:0);r.players.forEach((p,i)=>{p.x=-3+i*.8;p.z=3.5;p.dx=0;p.dz=0;});}
        else if(t.phase==='discussion'){t.phase='vote';t.deadline=now+this.timing.vote;}
        else if(t.phase==='vote'||t.phase==='runoff'){
          if(connected<this.quorum(r)){if(!t.voteGrace){t.voteGrace=true;t.deadline=now+20000;}else this.finish(r,'none','The vote lost its connection quorum. No score awarded.',now);}else this.tally(r,now);
        }
      }
    }return dirty;
  }
  completeChannel(r:Room,p:Player,c:Channel,now:number){const t=r.round!;
    if(c.kind==='scan'){const e=t.evidence.find(e=>e.id===c.target)!;if(!e.discoveredBy.includes(p.id))e.discoveredBy.push(p.id);if(this.elapsed(t,now)>=this.timing.escrow&&!e.sharedBy){e.sharedBy=p.id;this.log(t,`Recovery copy published: ${e.title}.`,now);}}
    else if(c.kind==='verify'){if((t.jammed[c.station]??0)>now)return;const e=t.evidence.find(e=>e.id===c.target)!;e.verified=true;this.log(t,`${p.name} verified ${e.title}${e.forged?' and exposed a forged export':''}.`,now);}
    else if(c.kind==='abort'){if(t.exfil&&now<t.exfil.endsAt){t.exfil=null;this.log(t,`${p.name} stopped the exfiltration.`,now);}}
    else{
      const cost=['forge','exfil'].includes(c.kind)?2:1;if((t.charges[p.id]??0)<cost)return;
      if(c.kind==='forge'){const e=t.evidence.find(e=>e.id===c.target);if(!e||e.verified)return;e.observed='02:15:30 UTC';e.forged=true;}
      if(c.kind==='jam')t.jammed[c.target]=now+10000;
      if(c.kind==='delay'){const repair=t.repairs[c.target];if(!repair||repair.complete)return;repair.jammedUntil=now+4000;}
      if(c.kind==='exfil'){if(t.repairs['repair-uplink'].complete||Object.values(t.repairs).filter(x=>x.complete).length>=2||t.deadline-now<40000)return;t.exfil={endsAt:now+this.timing.exfil};}
      t.charges[p.id]-=cost;t.cooldowns[p.id]=now+35000;(t.used[p.id]??=[]).push(c.kind==='jam'?'jam:'+c.target:c.kind);this.log(t,c.kind==='exfil'?'EXFILTRATION DETECTED. Abort the uplink.':'A facility system reported an anomaly.',now);
    }
  }
  snapshot(session:string,now=Date.now()):Snapshot {const r=this.locate(session);if(!r)return{type:'snapshot',room:null,self:null,serverTime:now};const p=this.member(r,session),t=r.round;
    return {type:'snapshot',serverTime:now,room:{code:r.code,mode:r.mode,hostId:r.hostId,phase:t?.phase??'lobby',roundId:t?.id??null,deadline:t?.deadline??null,serverTime:now,players:r.players.map(({id,name,color,ready,connected,score,x,z})=>({id,name,color,ready,connected,score,x,z,room:roomAt({x,z})})),suspects:r.mode==='coop'?[{id:'npc-mira',name:'Mira Voss'},{id:'npc-orin',name:'Orin Vale'},{id:'npc-tessa',name:'Tessa Rook'}]:r.players.map(({id,name})=>({id,name})),board:t?.evidence.filter(e=>e.sharedBy).map(clueView)??[],links:t?.links??[],repairs:t?Object.fromEntries(Object.entries(t.repairs).map(([k,v])=>[k,{step:v.step,complete:v.complete,jammedUntil:v.jammedUntil}])):{},jammed:t?.jammed??{},chat:r.chat,exfil:t?.exfil??null,elapsed:t?this.elapsed(t,now):0,paused:t?.pauseAt!==null&&t?.pauseAt!==undefined,pauseRemaining:t?.pauseAt?Math.max(0,45000-t.pauseSpent-(now-t.pauseAt)):45000,dossier:t?.dossier??false,result:t?.result??null,roundNumber:r.roundNumber,ruleHint:'Indict the culprit using a published record. Repair systems to contain the breach.',runoffTargets:t?.runoffTargets??[]},self:{id:p.id,role:t?.roles[p.id]??null,clues:t?.evidence.filter(e=>e.discoveredBy.includes(p.id)).map(clueView)??[],grants:t?.evidence.filter(e=>e.grantedTo===p.id).map(e=>e.id)??[],charges:t?.roles[p.id]==='traitor'?t.charges[p.id]:0,cooldownUntil:t?.cooldowns[p.id]??0,channel:t?.channels[p.id]?{kind:t.channels[p.id].kind,target:t.channels[p.id].target,endsAt:t.channels[p.id].endsAt}:null,vote:t?.votes[p.id]?.target??null,voteSubmitted:!!t?.votes[p.id],abilitiesUsed:t?.roles[p.id]==='traitor'?t.used[p.id]??[]:[]}};
  }
}

