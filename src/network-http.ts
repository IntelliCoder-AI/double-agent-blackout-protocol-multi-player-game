import { useEffect, useRef, useState } from 'react';
import type { Command, Snapshot } from '../shared/types';
type Pending={command:Command;resolve:()=>void;reject:(err:Error)=>void};
export function useHostedMission(){
 const [snapshot,setSnapshot]=useState<Snapshot>({type:'snapshot',room:null,self:null,serverTime:Date.now()});
 const [status,setStatus]=useState<'connecting'|'online'|'offline'>('connecting');const [error,setError]=useState('');
 const state=useRef(snapshot);state.current=snapshot;const queue=useRef<Pending[]>([]);const movement=useRef<Command|null>(null);
 const active=useRef(false);const lastMovement=useRef<{x:unknown;z:unknown}|null>(null);
 useEffect(()=>{let cancelled=false,ready=false,claim=true,stopped=false,failures=0;const controller=crypto.randomUUID();let timer:ReturnType<typeof setTimeout>;
  async function post(path:string,body?:unknown){const result=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(result.status===401)ready=false;if(!result.ok)throw Error(result.status===429?'Too many requests. Retrying shortly.':'Secure connection unavailable. Retrying.');return result.json();}
  async function poll(){if(cancelled||stopped)return;let wait=200;
   try{if(!ready){await post('/api/session');ready=true;}if(cancelled)return;
    const pending=queue.current[0];const cmd=pending?.command??movement.current;
    const result=await post('/api/sync',{controller,claim,command:cmd??undefined});if(cancelled)return;claim=false;
    if(result.code==='SESSION_REPLACED'){stopped=true;active.current=false;setStatus('offline');setError(result.message);for(const p of queue.current)p.reject(Error(result.message));queue.current=[];return;}
    if(result.type==='error')throw Error(result.message);
    active.current=true;setStatus('online');if(failures)setError('');failures=0;
    if(result.snapshot){setSnapshot(result.snapshot);state.current=result.snapshot;}
    if(pending&&result.response?.id===pending.command.id){queue.current.shift();if(result.response.type==='error'){pending.reject(Error(result.response.message));setError(result.response.message);}else pending.resolve();}
    if(cmd&&movement.current?.id===cmd.id)movement.current=null;
    wait=queue.current.length||movement.current?20:result.snapshot?.room?.phase==='investigation'?350:1000;
   }catch(err){if(cancelled)return;failures++;active.current=false;setStatus('offline');setError(err instanceof Error?err.message:'Connection is recovering.');wait=Math.min(5000,500*2**Math.min(4,failures));}
   if(!cancelled&&!stopped)timer=setTimeout(poll,wait);
  }
  void poll();return()=>{cancelled=true;active.current=false;clearTimeout(timer);for(const p of queue.current)p.reject(Error('Connection closed.'));queue.current=[];movement.current=null;};
 },[]);
 function send(type:string,payload:Record<string,unknown>={}){return new Promise<void>((resolve,reject)=>{
  if(!active.current){reject(Error('Connection is recovering. Try again shortly.'));return;}
  const command:Command={id:crypto.randomUUID(),type,payload,roundId:state.current.room?.roundId??null};
  if(type==='input.move'){const old=lastMovement.current;lastMovement.current={x:payload.x,z:payload.z};if(payload.x===0&&payload.z===0&&old?.x===0&&old?.z===0){resolve();return;}movement.current=command;resolve();return;}
  if(queue.current.length>=16){reject(Error('Please wait for your current action.'));return;}queue.current.push({command,resolve,reject});
 });}
 return {snapshot,status,error,setError,send};
}
