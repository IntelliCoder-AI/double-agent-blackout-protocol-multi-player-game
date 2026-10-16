import { walkable, type Point } from '../shared/world';
export function pathTo(start:Point,end:Point):Point[]{
 const size=.6;const key=(x:number,z:number)=>`${x},${z}`;const grid=(p:Point)=>({x:Math.round(p.x/size),z:Math.round(p.z/size)});
 const a=grid(start),b=grid(end),queue=[a],previous=new Map<string,string|null>([[key(a.x,a.z),null]]);let target='';
 for(let i=0;i<queue.length&&i<6000;i++){const cur=queue[i],k=key(cur.x,cur.z);if(Math.hypot(cur.x-b.x,cur.z-b.z)<=1){target=k;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cur.x+dx,z=cur.z+dz,n=key(x,z);if(previous.has(n)||![[0,0],[.18,0],[-.18,0],[0,.18],[0,-.18]].every(([ox,oz])=>walkable({x:x*size+ox,z:z*size+oz})))continue;previous.set(n,k);queue.push({x,z});}}
 if(!target)return[];const path:Point[]=[];for(let k:string|null=target;k;k=previous.get(k)??null){const[x,z]=k.split(',').map(Number);path.push({x:x*size,z:z*size});}const route=path.reverse();
 // Keep corners, but traverse straight corridors as one segment. Clearance
 // prevents small network steering errors from cutting across a wall edge.
 return route.filter((p,i)=>i===0||i===route.length-1||(p.x-route[i-1].x)*(route[i+1].z-p.z)!==(p.z-route[i-1].z)*(route[i+1].x-p.x));
}
