import { Suspense, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOMS, STATIONS, OBSTACLES, type Point } from '../shared/world';
import type { PublicRoom, SelfView } from '../shared/types';
import type { PerformanceSample } from '../shared/diagnostics';

const metal='#202e33',dark='#111d24',light='#b6f8e6';
function PerformanceProbe({measuring,quality,onSample}:{measuring:boolean;quality:string;onSample:(sample:PerformanceSample)=>void}){
 const data=useRef({frames:[] as number[],seconds:0,maxCalls:0,maxTriangles:0});const {gl,size}=useThree();
 useEffect(()=>{data.current={frames:[],seconds:0,maxCalls:0,maxTriangles:0};},[measuring,quality]);
 useFrame((_state,dt)=>{if(!measuring||document.visibilityState!=='visible'||data.current.seconds>=10)return;const d=data.current;d.frames.push(dt*1000);d.seconds+=dt;d.maxCalls=Math.max(d.maxCalls,gl.info.render.calls);d.maxTriangles=Math.max(d.maxTriangles,gl.info.render.triangles);if(d.seconds>=10){const sorted=[...d.frames].sort((a,b)=>a-b);onSample({frames:d.frames.length,seconds:+d.seconds.toFixed(2),averageFps:+(d.frames.length/d.seconds).toFixed(1),p95FrameMs:+sorted[Math.floor(sorted.length*.95)].toFixed(2),drawCalls:d.maxCalls,triangles:d.maxTriangles,textures:gl.info.memory.textures,geometries:gl.info.memory.geometries,quality,viewport:`${size.width}x${size.height}`,userAgent:navigator.userAgent});}});return null;
}
function Screen({text,at,width=1.4,height=.32,color='#a8f2cf'}:{text:string;at:[number,number,number];width?:number;height?:number;color?:string}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.font='600 42px monospace';ctx.textAlign='center';ctx.fillText(text.slice(0,32),384,78);return new THREE.CanvasTexture(canvas);},[text,color]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={at}><planeGeometry args={[width,height]}/><meshBasicMaterial map={texture} transparent depthWrite={false}/></mesh>;
}
function SecurityDisplay({room,reduced,onSelect}:{room:PublicRoom|null;reduced:boolean;onSelect:()=>void}){
 const display=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;return{canvas,texture:new THREE.CanvasTexture(canvas)};},[]);const last=useRef(-1);
 useEffect(()=>()=>display.texture.dispose(),[display]);
 useFrame(({clock})=>{const frame=Math.floor(clock.elapsedTime*(reduced?1:4));if(last.current===frame)return;last.current=frame;const g=display.canvas.getContext('2d')!;g.fillStyle='#06151e';g.fillRect(0,0,768,256);g.strokeStyle='#294e58';g.lineWidth=2;
  for(const r of ROOMS){g.strokeRect(384+r.x*14-r.w*7,132+r.z*7-r.d*3.5,r.w*14,r.d*7);g.fillStyle=r.color;g.font='12px monospace';g.fillText(r.name.toUpperCase(),384+r.x*14-r.w*7+5,132+r.z*7+4);}
  for(const p of room?.players??[]){g.fillStyle=p.color;g.beginPath();g.arc(384+p.x*14,132+p.z*7,4,0,Math.PI*2);g.fill();}
  g.fillStyle=room?.exfil?'#ff8e7f':'#a8f2cf';g.font='bold 18px monospace';g.fillText(room?.exfil?'WARNING / UPLINK ACTIVE':'AEGIS / LIVE FACILITY TELEMETRY',20,28);g.font='12px monospace';g.fillText(`${room?.mission?.title.toUpperCase()??'BLACKOUT PROTOCOL'} / ${room?.board.length??0} RECORDS`,20,242);
  if(!reduced){g.fillStyle='#84e0dc0d';g.fillRect(0,frame*11%256,768,12);}display.texture.needsUpdate=true;
 });
 return <group position={[0,2.2,-5.7]} onClick={e=>{e.stopPropagation();onSelect();}}><Box at={[0,0,-.07]} size={[7.4,2.5,.2]} color="#101d29"/><mesh><planeGeometry args={[7.1,2.3]}/><meshBasicMaterial map={display.texture}/></mesh></group>;
}
function Atmosphere({low,reduced}:{low:boolean;reduced:boolean}){
 const points=useRef<THREE.Points>(null!);const geometry=useMemo(()=>{const g=new THREE.BufferGeometry(),count=low?28:90,a=new Float32Array(count*3);for(let i=0;i<count;i++){a[i*3]=Math.sin(i*19.3)*17;a[i*3+1]=.8+(i%11)*.35;a[i*3+2]=Math.cos(i*7.1)*13;}g.setAttribute('position',new THREE.BufferAttribute(a,3));return g;},[low]);useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(({clock})=>{if(!reduced)points.current.position.y=Math.sin(clock.elapsedTime*.1)*.3;});
 return <points ref={points} geometry={geometry}><pointsMaterial color="#98d5e5" size={low?.025:.04} transparent opacity={.24} depthWrite={false}/></points>;
}
function Box({at,size,color=metal,glow,rotation=0,onClick}:{at:[number,number,number];size:[number,number,number];color?:string;glow?:string;rotation?:number;onClick?:(e:ThreeEvent<MouseEvent>)=>void}){return <mesh position={at} rotation={[0,rotation,0]} castShadow receiveShadow onClick={onClick}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={glow?.length?.55:.55} metalness={.65} emissive={glow??'#000000'} emissiveIntensity={glow?1.5:0}/></mesh>;}
function Label({text,at,color='#83ead4',size=1}:{text:string;at:[number,number,number];color?:string;size?:number}){
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=128;const g=c.getContext('2d')!;g.fillStyle=color;g.font='600 60px monospace';g.textAlign='center';g.fillText(text,512,85);return new THREE.CanvasTexture(c);},[text,color]);useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={at} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[size*6,size*.75]}/><meshBasicMaterial map={texture} transparent opacity={.72} depthWrite={false}/></mesh>;
}
function Environment(){const {scene}=useThree();useEffect(()=>{const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d')!;const gradient=g.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#a7c8bd');gradient.addColorStop(.4,'#152d38');gradient.addColorStop(.55,'#5faaa1');gradient.addColorStop(.7,'#12202a');gradient.addColorStop(1,'#070f16');g.fillStyle=gradient;g.fillRect(0,0,512,256);g.fillStyle='#caffeb';g.fillRect(80,70,100,10);g.fillRect(330,90,70,20);const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=t;return()=>{scene.environment=null;t.dispose();};},[scene]);return null;}
function Floor({onMove}:{onMove:(p:Point)=>void}){
 const tiles=useMemo(()=>{const list:{x:number;z:number}[]=[];for(const r of ROOMS)for(let x=r.x-r.w/2+.5;x<r.x+r.w/2;x++)for(let z=r.z-r.d/2+.5;z<r.z+r.d/2;z++)list.push({x,z});return list;},[]);
 const ref=useRef<THREE.InstancedMesh>(null!);useEffect(()=>{const o=new THREE.Object3D();tiles.forEach((p,i)=>{o.position.set(p.x,-.12,p.z);o.updateMatrix();ref.current.setMatrixAt(i,o.matrix);ref.current.setColorAt(i,new THREE.Color((Math.round(p.x+p.z)%3===0)?'#283c40':'#203037'));});ref.current.instanceMatrix.needsUpdate=true;},[tiles]);
 return <group><mesh position={[0,-.5,0]}><boxGeometry args={[40,.5,34]}/><meshStandardMaterial color="#070e13" roughness={.5} metalness={.6}/></mesh>
  <instancedMesh ref={ref} args={[undefined,undefined,tiles.length]} receiveShadow onClick={e=>{e.stopPropagation();onMove({x:e.point.x,z:e.point.z});}}><boxGeometry args={[.97,.2,.97]}/><meshStandardMaterial roughness={.42} metalness={.55}/></instancedMesh>
  {[{x:0,z:0,w:34,d:5},{x:-13,z:0,w:5,d:24},{x:13,z:0,w:5,d:24}].map((r,i)=><mesh key={i} position={[r.x,-.18,r.z]} receiveShadow onClick={e=>onMove({x:e.point.x,z:e.point.z})}><boxGeometry args={[r.w,.2,r.d]}/><meshStandardMaterial color="#24393c" roughness={.4} metalness={.6}/></mesh>)}
  {ROOMS.map(r=><group key={r.id}>
   <Box at={[r.x,0,r.z-r.d/2]} size={[r.w,.1,.08]} glow={r.color}/><Box at={[r.x-r.w/2,0,r.z]} size={[.08,.1,r.d]} glow={r.color}/>
   <Box at={[r.x,1.4,r.z-r.d/2-.1]} size={[r.w,2.8,.35]}/>
   {Array.from({length:Math.floor(r.w/2)},(_,i)=><group key={i}><Box at={[r.x-r.w/2+1+i*2,1.45,r.z-r.d/2+.12]} size={[1.7,1.7,.06]} color="#18343d" glow={i%3===0?r.color:undefined}/><Box at={[r.x-r.w/2+1+i*2,2.65,r.z-r.d/2+.2]} size={[1.4,.05,.07]} glow={r.color}/></group>)}
   <Label text={`${r.number} / ${r.name.toUpperCase()}`} at={[r.x,.04,r.z+r.d/2-1]} color={r.color} size={.85}/>
  </group>)}
 </group>;
}
function HoloTable({room,onBoard,reduced}:{room:PublicRoom|null;onBoard:()=>void;reduced:boolean}){
 const ring=useRef<THREE.Group>(null!);const projection=useRef<THREE.Group>(null!);
 useFrame(({clock})=>{if(!reduced){ring.current.rotation.y=clock.elapsedTime*.08;projection.current.position.y=.03*Math.sin(clock.elapsedTime*1.5);}});
 return <group onClick={e=>{e.stopPropagation();onBoard();}}>
  <Box at={[0,.35,0]} size={[5,.7,2.8]} color="#172529"/>
  <Box at={[0,.76,0]} size={[4.6,.12,2.5]} color="#0a1a20" glow="#12342e"/>
  <Box at={[0,.85,0]} size={[4.3,.03,2.1]} color="#153d3b"/>
  <group ref={projection}>
   <mesh position={[0,1.65,0]}><cylinderGeometry args={[.7,1.7,1.6,6,1,true]}/><meshBasicMaterial color="#58e5c5" transparent opacity={.06} side={THREE.DoubleSide} depthWrite={false}/></mesh>
   <mesh position={[0,1.15,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.15,1.18,64]}/><meshBasicMaterial color={light} transparent opacity={.8} side={THREE.DoubleSide}/></mesh>
   <mesh position={[0,1.2,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.75,.77,6]}/><meshBasicMaterial color={light} side={THREE.DoubleSide}/></mesh>
   <group ref={ring}>{Array.from({length:12},(_,i)=><group key={i} rotation={[0,i*Math.PI/6,0]}><Box at={[0,1.3,1.05]} size={[.025,.04,.2]} glow="#76f2d2"/></group>)}</group>
  </group>
  <Box at={[0,2.1,-3.2]} size={[6,3.1,.13]} color="#102229"/>
  <Box at={[0,3.7,-3.2]} size={[6.3,.09,.16]} glow="#87edd4"/>
  <Box at={[-3.1,2.1,-3.2]} size={[.06,3.2,.16]} glow="#4cb9aa"/>
  {Array.from({length:6},(_,i)=>{const active=room?.board[i];return <group key={i} position={[-2+i%3*2,2.8-Math.floor(i/3)*1.3,-3.1]}><Box at={[0,0,0]} size={[1.55,.9,.035]} color={active?'#20574f':'#173038'} glow={active?.verified?'#4d8e79':undefined}/>{[0,1,2].map(j=><Box key={j} at={[-.1,.2-j*.16,.04]} size={[j===0?1.05:.8,.025,.02]} glow={active?'#9ff8df':'#26504d'}/>)}</group>;})}
  {room?.board.map((card,i)=><Screen key={card.id} text={card.value} at={[-2+i%3*2,2.76-Math.floor(i/3)*1.3,-3.025]} width={1.4} height={.23} color={card.verified?'#b9ffe1':'#e7c18d'}/>)}
  {room?.links.map((link,i)=><group key={link.id}><Box at={[-1+i*2,2.15,-3]} size={[1.4,.025,.025]} glow="#d5ffe8"/><Screen text={link.label.toUpperCase()} at={[-1+i*2,1,-3.01]} width={1.8} height={.2}/></group>)}
  <Label text="LIVING EVIDENCE NETWORK" at={[0,.04,2.2]} size={.7}/>
 </group>;
}
function Reactor({stable,reduced,alert}:{stable:boolean;reduced:boolean;alert:boolean}){
 const rotor=useRef<THREE.Group>(null!);useFrame(({clock})=>{if(!reduced)rotor.current.rotation.y=clock.elapsedTime*(stable?.12:.3);});const c=alert?'#ff725c':stable?'#92efc8':'#79e4d7';
 return <group position={[13,0,9]}><mesh position={[0,.25,0]}><cylinderGeometry args={[1.7,2,.5,12]}/><meshStandardMaterial color={metal} metalness={.8} roughness={.3}/></mesh>
  <mesh position={[0,2,0]}><cylinderGeometry args={[1.08,1.08,3.3,24,1,true]}/><meshPhysicalMaterial color="#7ad7d2" roughness={.12} metalness={.3} transparent opacity={.12} side={THREE.DoubleSide} depthWrite={false}/></mesh>
  <mesh position={[0,2,0]}><cylinderGeometry args={[.6,.6,2.8,8]}/><meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.8} transparent opacity={.75}/></mesh>
  <group ref={rotor}>{[.6,2,3.5].map((y,i)=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,i*.4,0]}><torusGeometry args={[1.2,.08,8,48]}/><meshStandardMaterial color={c} emissive={c} emissiveIntensity={1}/></mesh>)}</group>
  {[0,1,2,3].map(i=><group key={i} rotation={[0,i*Math.PI/2,0]}><Box at={[1.4,1.8,0]} size={[.22,3.4,.3]}/><Box at={[1.43,1.8,.16]} size={[.06,2.6,.04]} glow={c}/></group>)}
 </group>;
}
function Furniture(){return <group>{[10,13].map(x=><group key={x}>{[-13.7,-12.5].map(z=><group key={z}><Box at={[x,1.6,z]} size={[1.3,3.2,1]}/>{Array.from({length:10},(_,i)=><group key={i}><Box at={[x, .25+i*.28,z+.52]} size={[1.05,.17,.02]} color="#0a171d"/><Box at={[x+.38,.25+i*.28,z+.55]} size={[.1,.04,.02]} glow={i%3?'#6ddfc4':'#eda27b'}/></group>)}</group>)}</group>)}
 {[-16.8].map(x=>[8,10,12].map(z=><group key={z}><Box at={[x,1.3,z]} size={[1,2.6,1.6]}/>{[0,1,2,3].map(i=><Box key={i} at={[x+.52,.4+i*.6,z]} size={[.05,.04,1.3]} glow="#c7ad70"/>)}</group>))}
 <Box at={[-13,.7,-13.6]} size={[7,1.4,1]} />{[-15,-13,-11].map(x=><group key={x}><Box at={[x,1.9,-13.8]} size={[1.6,.95,.1]} color="#28535c" glow="#24454e"/>{[0,1,2,3].map(i=><Box key={i} at={[x-.4+i*.23,1.9+Math.sin(i)*.15,-13.7]} size={[.04,.3,.02]} glow="#7fc2cf"/>)}</group>)}
 {[[-6,3],[6,-3],[-17,-3],[17,3]].map(([x,z],i)=><group key={i}><Box at={[x,1.9,z]} size={[.3,3.8,.3]}/><Box at={[x,3.7,z]} size={[2,.1,.3]} glow="#bdeedd"/></group>)}
 </group>;}
function Station({station,active,onSelect,room}:{station:typeof STATIONS[number];active:boolean;onSelect:(id:string)=>void;room:PublicRoom|null}){
 const s=station;const complete=room?.repairs[s.id]?.complete;const c=complete?'#a4eb93':s.kind==='abort'||s.kind==='exfil'?'#ed9f83':'#7ee6d0';
 if(s.id==='board')return null;
 return <group position={[s.x,0,s.z]} onClick={e=>{e.stopPropagation();onSelect(s.id);}}>
  <Box at={[0,.32,0]} size={[.6,.65,.5]} color="#263b41"/><mesh position={[0,.72,0]} rotation={[-.4,0,0]}><boxGeometry args={[.75,.4,.05]}/><meshStandardMaterial color={c} emissive={c} emissiveIntensity={active?1.5:.4}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]}><ringGeometry args={[active?.72:.5,active?.76:.52,32]}/><meshBasicMaterial color={c} transparent opacity={active?.9:.35}/></mesh>
  {active&&<mesh position={[0,1.3,0]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.12,.12,.12]}/><meshBasicMaterial color={c}/></mesh>}
 </group>;
}
function Avatar({p,self,reduced}:{p:{x:number;z:number;color:string;connected:boolean};self:boolean;reduced:boolean}){
 const g=useRef<THREE.Group>(null!),legs=useRef<THREE.Group>(null!);const target=useRef(new THREE.Vector3()),delta=useRef(new THREE.Vector3());
 useFrame(({clock},dt)=>{target.current.set(p.x,0,p.z);delta.current.copy(target.current).sub(g.current.position);const moving=delta.current.length()>.015;if(moving)g.current.rotation.y=Math.atan2(delta.current.x,delta.current.z);g.current.position.lerp(target.current,Math.min(1,dt*12));legs.current.rotation.x=!reduced&&moving?Math.sin(clock.elapsedTime*12)*.18:0;});
 return <group ref={g} position={[p.x,0,p.z]}><group ref={legs}><Box at={[-.14,.3,0]} size={[.2,.6,.24]} color="#17252f"/><Box at={[.14,.3,0]} size={[.2,.6,.24]} color="#17252f"/></group><mesh position={[0,.85,0]} castShadow><capsuleGeometry args={[.26,.38,4,8]}/><meshStandardMaterial color="#35434b" roughness={.6}/></mesh><Box at={[0,.9,.23]} size={[.25,.18,.04]} glow={p.color}/><mesh position={[0,1.4,0]} castShadow><sphereGeometry args={[.23,12,8]}/><meshStandardMaterial color="#738783" metalness={.8} roughness={.25}/></mesh><Box at={[0,1.42,.18]} size={[.34,.09,.08]} glow={p.color}/><mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.38,.41,32]}/><meshBasicMaterial color={p.color} transparent opacity={self?1:.4}/></mesh></group>;
}
function Camera({player,menu,reduced}:{player?:Point;menu:boolean;reduced:boolean}){const {camera}=useThree();const target=useRef(new THREE.Vector3());useFrame(({clock},dt)=>{const p=menu?{x:3,z:0}:player??{x:0,z:0};const d=menu?27:18;const pos=new THREE.Vector3(p.x+d+(menu&&!reduced?Math.sin(clock.elapsedTime*.045)*2:0),menu?29:23,p.z+d);camera.position.lerp(pos,Math.min(1,dt*(menu?.8:3)));target.current.lerp(new THREE.Vector3(p.x,0,p.z),Math.min(1,dt*3));camera.lookAt(target.current);});return null;}
const StaticFloor=memo(Floor),StaticFurniture=memo(Furniture);
export function World({room,self,onStation,onMove,selected,quality,reduced,onReady,measuring=false,onPerformance=()=>{}}:{room:PublicRoom|null;self:SelfView|null;onStation:(id:string)=>void;onMove:(p:Point)=>void;selected:string|null;quality:string;reduced:boolean;onReady:()=>void;measuring?:boolean;onPerformance?:(sample:PerformanceSample)=>void}){
 const low=quality==='low';const player=room?.players.find(p=>p.id===self?.id);const menu=!room||room.phase==='lobby';
 const moveHandler=useRef(onMove);moveHandler.current=onMove;const moveTo=useCallback((p:Point)=>moveHandler.current(p),[]);
 return <Canvas shadows={!low} dpr={low?1:[1,1.5]} camera={{position:[28,30,33],fov:43,near:.1,far:160}} gl={{antialias:!low,powerPreference:'high-performance'}} onCreated={()=>onReady()} fallback={<div className="webgl-error">This device could not initialize 3D graphics. Enable hardware acceleration and reload.</div>}>
  <color attach="background" args={['#081215']}/><fog attach="fog" args={['#081215',40,100]}/><Environment/>
  <ambientLight intensity={.6}/><hemisphereLight args={['#bcf8e4','#1d3044',1.4]}/><directionalLight position={[5,25,8]} intensity={2.5} color="#b9e8d5" castShadow={!low} shadow-mapSize={[1024,1024]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} shadow-bias={-.001}/>
  <directionalLight position={[-20,6,-15]} intensity={1.5} color="#6ca3b2"/>
  <Suspense fallback={null}><StaticFloor onMove={moveTo}/><StaticFurniture/><Atmosphere low={low} reduced={reduced}/><SecurityDisplay room={room} reduced={reduced} onSelect={()=>onStation('footage')}/><HoloTable room={room} onBoard={()=>onStation('board')} reduced={reduced}/><Reactor stable={room?.repairs['repair-reactor']?.complete??false} alert={!!room?.exfil} reduced={reduced}/>
   {STATIONS.map(s=><Station key={s.id} station={s} active={selected===s.id} onSelect={onStation} room={room}/>)}
   {room?.players.map(p=><Avatar key={p.id} p={p} self={p.id===self?.id} reduced={reduced}/>)}
  </Suspense><Camera player={player} menu={menu} reduced={reduced}/><PerformanceProbe measuring={measuring} quality={quality} onSample={onPerformance}/>
 </Canvas>;
}
