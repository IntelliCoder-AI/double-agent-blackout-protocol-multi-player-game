import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../shared/types';
import { useHostedMission } from './network-http';
export const useMission=import.meta.env.VITE_TRANSPORT==='https'?useHostedMission:useWebSocketMission;
function useWebSocketMission(){
 const [snapshot,setSnapshot]=useState<Snapshot>({type:'snapshot',room:null,self:null,serverTime:Date.now()});
 const [status,setStatus]=useState<'connecting'|'online'|'offline'>('connecting');const [error,setError]=useState('');
 const wsRef=useRef<WebSocket|null>(null);const pending=useRef(new Map<string,{resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>());
 const stateRef=useRef(snapshot);stateRef.current=snapshot;
 useEffect(()=>{let cancelled=false,retry:ReturnType<typeof setTimeout>,delay=500;let socket:WebSocket|null=null;
   async function connect(){if(cancelled)return;setStatus('connecting');try{const r=await fetch('/api/session',{method:'POST',credentials:'same-origin'});if(!r.ok)throw Error('Unable to establish a secure guest session.');if(cancelled)return;
    socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);wsRef.current=socket;
    socket.onopen=()=>{setStatus('online');setError('');delay=500;};
    socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='snapshot')setSnapshot(m);else if(m.type==='ack'||m.type==='error'){const p=pending.current.get(m.id);if(p){clearTimeout(p.timer);pending.current.delete(m.id);m.type==='ack'?p.resolve():p.reject(Error(m.message));}if(m.type==='error'&&m.code!=='WRONG_PHASE'){setError(m.message);}}};
    socket.onclose=e=>{setStatus('offline');if(e.code===4001){setError('This guest session is open in another tab. Use a different browser profile for a second player.');return;}if(!cancelled){retry=setTimeout(connect,delay+Math.random()*250);delay=Math.min(10000,delay*2);}};
    socket.onerror=()=>socket?.close();
   }catch(e){setStatus('offline');setError(e instanceof TypeError?'Secure connection unavailable. Retrying…':e instanceof Error?e.message:'Connection failed.');if(!cancelled){retry=setTimeout(connect,delay);delay=Math.min(10000,delay*2);}}}
   void connect();return()=>{cancelled=true;clearTimeout(retry);socket?.close();for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(Error('Connection closed.'));}pending.current.clear();};
 },[]);
 const send=(type:string,payload:Record<string,unknown>={})=>new Promise<void>((resolve,reject)=>{
   const ws=wsRef.current;if(!ws||ws.readyState!==WebSocket.OPEN){reject(Error('Connection is recovering. Try again shortly.'));return;}
   const id=crypto.randomUUID();if(type!=='input.move'){const timer=setTimeout(()=>{pending.current.delete(id);reject(Error('The server did not confirm this action. Reconnect before retrying.'));},10000);pending.current.set(id,{resolve,reject,timer});}
   ws.send(JSON.stringify({id,type,roundId:stateRef.current.room?.roundId??null,payload}));if(type==='input.move')resolve();
 });
 return {snapshot,status,error,setError,send};
}
