import { randomInt } from 'node:crypto';
import type { ClueView } from '../shared/types';
export interface Evidence { id:string; title:string; summary:string; kind:string; canonical:string; observed:string; candidates?:string[]; grantedTo:string; discoveredBy:string[]; sharedBy?:string; verified:boolean; forged:boolean }
export function shuffle<T>(items:T[]) { const a=[...items]; for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
export function makeCase(suspects:string[],culprit:string,players:string[]):Evidence[] {
  const decoys=shuffle(suspects.filter(id=>id!==culprit));
  const cut=Math.ceil(decoys.length/2); const a=shuffle([culprit,...decoys.slice(0,cut)]), b=shuffle([culprit,...decoys.slice(cut)]);
  if(a.filter(x=>b.includes(x)).join()!==culprit||a.length<2||b.length<2)throw Error('Invalid case');
  const holders=shuffle(players);
  const cards=[
    {id:'footage',title:'A figure in the vault',summary:'Camera local time: 02:15:30. This exported timestamp claims to be UTC. The badge silhouette matches these operatives.',kind:'footage',canonical:'02:14:00 UTC',candidates:a},
    {id:'reader',title:'One authenticated access',summary:'A second-factor credential opened the vault during event E-401. The authorized operator is in this group.',kind:'credential',canonical:'E-401 � 02:14:00 UTC',candidates:b},
    {id:'clock',title:'Ninety seconds ahead',summary:'The surveillance clock runs 90 seconds ahead of UTC. Subtract 90 seconds from camera time.',kind:'clock',canonical:'+90 seconds'},
    {id:'manifest',title:'The custody rule',summary:'The two recorded credential factors cannot be transferred during this interval. Find the person in BOTH access groups.',kind:'manifest',canonical:'Two factors � one operator'},
    {id:'frame',title:'An unbroken signature',summary:'An independent recorder signs the vault frame. Camera-local time is 02:15:30; this signature cannot be edited.',kind:'signature',canonical:'E-401 � local 02:15:30'},
    {id:'event',title:'The missing memory core',summary:'Core bay and reader report the same event: E-401, at 02:14 UTC. This was a physical theft, not a remote download.',kind:'event',canonical:'E-401 � 02:14:00 UTC'},
  ];
  return shuffle(cards).map((e,i)=>({...e,observed:e.canonical,grantedTo:e.id==='footage'?holders[0]:e.id==='reader'?holders[1]:e.id==='clock'?holders[2%holders.length]:holders[i%holders.length],discoveredBy:[],verified:false,forged:false}));
}
export function clueView(e:Evidence):ClueView {
  return {id:e.id,title:e.title,summary:e.summary,kind:e.kind,value:e.verified?e.canonical:e.observed,candidates:e.candidates? [...e.candidates]:undefined,verified:e.verified,sharedBy:e.sharedBy,
    ...(e.verified&&e.forged?{discrepancy:'Export differs from the signed source.',originalValue:e.observed}: {})};
}
