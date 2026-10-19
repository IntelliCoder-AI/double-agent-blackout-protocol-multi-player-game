import { Component, useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { World } from './World';
import { TacticalFallback } from './TacticalFallback';

function supports3D(){
 try{const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2');if(!context)return false;context.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}
}

class GraphicsBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.onFailure();}
 render(){return this.state.failed?null:this.props.children;}
}

/** Graphics failures must never cover the mission UI or silently wait forever. */
export function Headquarters({onPerformanceRetry,...props}:Omit<ComponentProps<typeof World>,'onReady'> & {onPerformanceRetry:()=>void}){
 const [state,setState]=useState<'loading'|'ready'|'failed'>(()=>supports3D()?'loading':'failed');
 const [attempt,setAttempt]=useState(0);
 const failed=useCallback(()=>setState('failed'),[]);
 const ready=useCallback(()=>setState('ready'),[]);
 useEffect(()=>{
  if(state!=='loading')return;
  let visibleMs=0;
  const timeout=setInterval(()=>{if(document.visibilityState==='visible')visibleMs+=500;if(visibleMs>=12000)failed();},500);
  return()=>clearInterval(timeout);
 },[state,attempt,failed]);
 return <>
  {state!=='failed'&&<GraphicsBoundary key={attempt} onFailure={failed}><World {...props} onReady={ready} onFailure={failed}/></GraphicsBoundary>}
  {state==='failed'&&<TacticalFallback room={props.room} self={props.self} onStation={props.onStation} onMove={props.onMove} selected={props.selected}/>}
  {state==='loading'&&<div className="graphics-status" role="status">INITIALIZING HEADQUARTERS…</div>}
  {state==='failed'&&<div className="graphics-status graphics-failed" role="alert"><strong>3D headquarters could not start.</strong><span>The mission connection is still active. Retry with lower graphics, or enable browser hardware acceleration.</span><button className="secondary" onClick={()=>{onPerformanceRetry();setAttempt(n=>n+1);setState('loading');}}>Retry 3D in performance mode</button></div>}
 </>;
}
