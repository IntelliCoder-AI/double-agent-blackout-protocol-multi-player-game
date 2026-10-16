import type { PublicRoom } from '../shared/types';
export function downloadReport(filename:string,data:unknown){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function roundReport(room:PublicRoom){
 if(!room.result)throw Error('Finish the mission before exporting a report.');
 return {format:'aegis-playtest-v1',case:room.mission.id,round:room.roundNumber,winner:room.result.winner,reason:room.result.reason,metrics:room.result.metrics,observations:{understoodWithin90Seconds:null,fairness1to5:null,enjoyment1to5:null,notes:''}};
}
