import { randomInt } from 'node:crypto';
import type { ClueView } from '../shared/types.js';
import { missionBrief, type MissionId } from '../shared/missions.js';
export interface Evidence { id:string; title:string; summary:string; kind:string; canonical:string; observed:string; candidates?:string[]; grantedTo:string; discoveredBy:string[]; sharedBy?:string; verified:boolean; forged:boolean }
export function shuffle<T>(items:T[]) { const a=[...items]; for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
interface CaseTruth {event:string;normalized:string;exported:string;receipt:string;cameraTitle:string;cameraSummary:string;receiptTitle:string;receiptSummary:string;frame:string;object:string;custody:string;explanation:string}
const TRUTHS:Record<MissionId,CaseTruth>={
 ghost:{event:'E-401',normalized:'02:14:00',exported:'02:15:30 UTC',receipt:'+90 seconds',cameraTitle:'A figure in the vault',cameraSummary:'Camera local time: 02:15:30. The export incorrectly labels local time as UTC.',receiptTitle:'Ninety seconds ahead',receiptSummary:'The camera runs 90 seconds ahead of UTC. Subtract 90 seconds from 02:15:30.',frame:'E-401 | local 02:15:30',object:'memory core',custody:'The badge and palm seal cannot change hands during this interval.',explanation:'02:15:30 minus 90 seconds is 02:14:00 UTC. The clock and export describe the same theft.'},
 mirror:{event:'M-718',normalized:'B-17',exported:'71-B',receipt:'MIRROR: read right to left',cameraTitle:'The reflected courier',cameraSummary:'The lens sees badge 71-B in a maintenance mirror. The export presents it as a direct view.',receiptTitle:'Optical calibration',receiptSummary:'This camera views a mirror. Reverse the complete character order: 71-B becomes B-17. The signed camera frame already applies this calibration.',frame:'M-718 | reflected 71-B | direct B-17',object:'master cipher',custody:'A one-use courier seal and the dispatch palm print must belong to the same operative.',explanation:'Reading the reflected code 71-B right to left restores B-17. It matches the direct-view signature.'},
 relay:{event:'R-209',normalized:'03:06:00',exported:'05:06:00 UTC',receipt:'Station zone: UTC+02:00',cameraTitle:'A carrier at the relay',cameraSummary:'Relay camera clock: 05:06:00 station time. The export incorrectly labels station time as UTC.',receiptTitle:'The station zone receipt',receiptSummary:'The relay uses UTC+02:00. Subtract two hours from station time 05:06:00 to align with the antenna ledger.',frame:'R-209 | station 05:06:00 | UTC+02:00',object:'satellite signing key',custody:'The relay badge and antenna palm print were captured during one sealed key-carry interval.',explanation:'05:06:00 in UTC+02:00 is 03:06:00 UTC. The carrier and antenna burst share one signed event.'},
 cold:{event:'C-045',normalized:'SEQ-045',exported:'SEQ-042',receipt:'Restored cache: add 3',cameraTitle:'The frozen handoff',cameraSummary:'The restored camera export says SEQ-042. Its cache was rolled back before the transfer was exported.',receiptTitle:'The recovery journal',receiptSummary:'The signed recovery journal records a three-frame rollback. Add 3 to exported sequence 042, retaining three digits.',frame:'C-045 | cache 042 + recovery 003',object:'sealed pathogen index',custody:'The archive seal and cold-room palm print were captured before the sealed capsule could be exchanged.',explanation:'Sequence 042 plus the three restored frames is SEQ-045. The archive transfer receipt confirms C-045.'},
 midnight:{event:'D-999',normalized:'23:59:10',exported:'00:00:40 UTC',receipt:'+90 seconds | day rollover',cameraTitle:'The midnight crossing',cameraSummary:'Bridge camera: 00:00:40 on day 18. The export labels it as UTC without applying the clock receipt.',receiptTitle:'Across the date line',receiptSummary:'The bridge camera is 90 seconds fast. Subtract 90 seconds from day 18, 00:00:40: the UTC event falls on day 17.',frame:'D-999 | camera day 18 00:00:40',object:'diplomatic identity pack',custody:'The bridge badge and drop-box palm print were captured in one uninterrupted crossing.',explanation:'Day 18 00:00:40 minus 90 seconds is day 17 23:59:10 UTC. The apparent next-day alibi fails.'},
};
export function caseTruth(id?:string){return TRUTHS[missionBrief(id).id];}
export function makeCase(suspects:string[],culprit:string,players:string[],caseId?:string):Evidence[] {
 if(players.length<2||!suspects.includes(culprit)||new Set(suspects).size!==suspects.length)throw Error('Invalid case roster');
 const truth=caseTruth(caseId),decoys=shuffle(suspects.filter(id=>id!==culprit));
 const cut=Math.ceil(decoys.length/2),a=shuffle([culprit,...decoys.slice(0,cut)]),b=shuffle([culprit,...decoys.slice(cut)]);
 if(a.filter(x=>b.includes(x)).join()!==culprit||a.length<2||b.length<2)throw Error('Invalid case');
 const holders=shuffle(players);
 const cards=[
  {id:'footage',title:truth.cameraTitle,summary:truth.cameraSummary+' The silhouette matches the operatives shown below.',kind:'footage',canonical:truth.normalized+(/^\d{2}:/.test(truth.normalized)?' UTC':''),candidates:a},
  {id:'reader',title:'The sealed access receipt',summary:`The second credential factor records event ${truth.event}. Its custody group is shown below.`,kind:'credential',canonical:`${truth.event} | ${truth.normalized}`,candidates:b},
  {id:'clock',title:truth.receiptTitle,summary:truth.receiptSummary,kind:'clock',canonical:truth.receipt},
  {id:'manifest',title:'An unbroken custody chain',summary:`${truth.custody} Find the person in BOTH authenticated groups.`,kind:'manifest',canonical:'Two factors | one operator'},
  {id:'frame',title:'The immutable frame signature',summary:'The independent recorder is append-only. Compare this signed reference with the exported camera record.',kind:'signature',canonical:truth.frame},
  {id:'event',title:`The missing ${truth.object}`,summary:`The physical transfer sensor and reader share ${truth.event}. This is a custody breach involving the ${truth.object}, not an unexplained remote download.`,kind:'event',canonical:`${truth.event} | ${truth.normalized}`},
 ];
 return shuffle(cards).map((e,i)=>({...e,observed:e.canonical,grantedTo:e.id==='footage'?holders[0]:e.id==='reader'?holders[1]:e.id==='clock'?holders[2%holders.length]:holders[i%holders.length],discoveredBy:[],verified:false,forged:false}));
}
export function clueView(e:Evidence):ClueView {
 return {id:e.id,title:e.title,summary:e.summary,kind:e.kind,value:e.verified?e.canonical:e.observed,candidates:e.candidates?[...e.candidates]:undefined,verified:e.verified,sharedBy:e.sharedBy,
 ...(e.verified&&e.forged?{discrepancy:'Export differs from the signed source.',originalValue:e.observed}:{})};
}
