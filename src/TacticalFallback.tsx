import { useRef } from 'react';
import { OBSTACLES, ROOMS, STATIONS, type Point } from '../shared/world';
import type { PublicRoom, SelfView } from '../shared/types';

/** Explicit live vector fallback for browsers without WebGL. Never presented as 3D. */
export function TacticalFallback({room,self,onStation,onMove,selected}:{room:PublicRoom|null;self:SelfView|null;onStation:(id:string)=>void;onMove:(point:Point)=>void;selected:string|null}){
 const svg=useRef<SVGSVGElement>(null);
 return <div className="tactical-fallback"><svg ref={svg} viewBox="-21 -19 42 38" role="group" aria-label="Live tactical facility map" onClick={event=>{
  const point=svg.current!.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const matrix=svg.current!.getScreenCTM();if(!matrix)return;const target=point.matrixTransform(matrix.inverse());onMove({x:target.x,z:target.y});
 }}>
  <defs><pattern id="tactical-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#83ecd5" strokeWidth=".015" opacity=".15"/></pattern></defs>
  <rect x="-21" y="-19" width="42" height="38" fill="#08151c"/><rect x="-21" y="-19" width="42" height="38" fill="url(#tactical-grid)"/>
  {[{x:0,z:0,w:34,d:5},{x:-13,z:0,w:5,d:24},{x:13,z:0,w:5,d:24}].map((r,i)=><rect key={i} x={r.x-r.w/2} y={r.z-r.d/2} width={r.w} height={r.d} fill="#1c3037"/>)}
  {ROOMS.map(r=><g key={r.id}><rect x={r.x-r.w/2} y={r.z-r.d/2} width={r.w} height={r.d} fill="#132832" stroke={r.color} strokeWidth=".07"/><text x={r.x} y={r.z+r.d/2-.6} textAnchor="middle" fill={r.color} fontSize=".55">{r.number} / {r.name.toUpperCase()}</text></g>)}
  {OBSTACLES.map((o,i)=><rect key={i} x={o.x-o.w/2} y={o.z-o.d/2} width={o.w} height={o.d} rx=".15" fill="#38515c"/>)}
  {STATIONS.map(station=><g key={station.id} className="tactical-station" role="button" tabIndex={0} aria-label={station.name+' console'} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onStation(station.id);}}} onClick={event=>{event.stopPropagation();onStation(station.id);}}>
   <title>{station.name}</title><circle cx={station.x} cy={station.z} r={selected===station.id ? .8 : .6} fill={station.kind==='abort'?'#e99e7b':station.kind==='board'?'#baffde':self?.grants.includes(station.id)?'#83ecd5':'#7e99ac'} stroke={selected===station.id?'white':'#0b161d'} strokeWidth=".13"/>
   <text x={station.x} y={station.z+.2} textAnchor="middle" fontSize=".55" fill="#08151c" pointerEvents="none">{station.kind==='board'?'W':station.kind==='verify'?'V':station.kind==='repair'?'R':station.kind==='abort'?'!':station.kind==='exfil'?'X':'E'}</text>
  </g>)}
  {room?.players.map(player=><g key={player.id} pointerEvents="none"><circle cx={player.x} cy={player.z} r={player.id===self?.id ? .42 : .32} fill={player.color} stroke="#fff" strokeWidth=".1"/><text x={player.x} y={player.z-1} fontSize=".5" fill={player.color} textAnchor="middle">{player.id===self?.id?'YOU':player.name}</text></g>)}
 </svg><p className="tactical-label">LIVE TACTICAL VIEW / WEBGL UNAVAILABLE · TAP FLOOR TO WALK · SELECT A CONSOLE</p></div>;
}
