import { useState } from 'react';
import type { PublicRoom } from '../shared/types';
const nodes=['clock','footage','frame','event','reader','manifest'];
const initial=Object.fromEntries(nodes.map((id,i)=>[id,{x:80+i%3*300,y:55+Math.floor(i/3)*110}]));
export function EvidenceGraph({room,selected,onSelect}:{room:PublicRoom;selected:string;onSelect:(id:string)=>void}){
 const [positions,setPositions]=useState(initial);
 return <div className="evidence-network"><div className="network-legend"><span><i/> {room.links.length}/2 SUPPORTED CONNECTIONS</span><small>Drag nodes to arrange · select to inspect</small></div><svg viewBox="0 0 800 220" role="group" aria-label="Shared evidence connections">
  <defs><pattern id="network-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#85e5cf" opacity=".14"/></pattern></defs><rect width="800" height="220" fill="url(#network-grid)"/>
  {room.links.map(link=>{const a=positions[link.from],b=positions[link.to];return a&&b?<g key={link.id}><path className="network-link" d={`M${a.x},${a.y} C${a.x+120},${a.y} ${b.x-120},${b.y} ${b.x},${b.y}`}/><circle cx={(a.x+b.x)/2} cy={(a.y+b.y)/2} r="5" fill="#bdf9d9"/></g>:null;})}
  {nodes.map(id=>{const clue=room.board.find(c=>c.id===id),p=positions[id];return <g key={id} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={clue?0:-1} aria-label={clue?`${clue.title}, ${clue.verified?'authenticated':'unverified'}`:'Undiscovered record'} onKeyDown={e=>{if(clue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSelect(id);}}} onClick={()=>clue&&onSelect(id)} onPointerDown={e=>{if(clue)e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!clue||!e.currentTarget.hasPointerCapture(e.pointerId))return;const svg=e.currentTarget.ownerSVGElement!,point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const m=svg.getScreenCTM();if(!m)return;const q=point.matrixTransform(m.inverse());setPositions(old=>({...old,[id]:{x:Math.max(78,Math.min(722,q.x)),y:Math.max(37,Math.min(183,q.y))}}));}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} className={`network-node ${clue?'discovered':''} ${selected===id?'chosen':''}`}>
   <rect x="-72" y="-31" width="144" height="62" rx="5"/><circle cx="-56" cy="-16" r="3" fill={clue?.verified?'#bdf9d9':'#6b8586'}/><text x="-45" y="-12" className="node-type">{clue?clue.kind.toUpperCase():'ENCRYPTED'}</text><text x="-57" y="9">{clue?clue.title.slice(0,21):'Recover a fragment'}</text><text x="-57" y="23" className="node-state">{clue?.verified?'SIGNED SOURCE':clue?'VERIFY AT TERMINAL':'PRIVATE LOCATION'}</text>
  </g>;})}
 </svg></div>;
}
