import { walkable, type Point } from '../shared/world';
export function pathTo(start:Point,end:Point):Point[]{
 const size=.6;const key=(x:number,z:number)=>`${x},${z}`;const grid=(p:Point)=>({x:Math.round(p.x/size),z:Math.round(p.z/size)});
 const a=grid(start),b=grid(end),queue=[a],previous=new Map<string,string|null>([[key(a.x,a.z),null]]);let target='';
 for(let i=0;i<queue.length&&i<6000;i++){const cur=queue[i],k=key(cur.x,cur.z);if(Math.hypot(cur.x-b.x,cur.z-b.z)<=1){target=k;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cur.x+dx,z=cur.z+dz,n=key(x,z);if(previous.has(n)||!walkable({x:x*size,z:z*size}))continue;previous.set(n,k);queue.push({x,z});}}
 if(!target)return[];const path:Point[]=[];for(let k:string|null=target;k;k=previous.get(k)??null){const[x,z]=k.split(',').map(Number);path.push({x:x*size,z:z*size});}return path.reverse().slice(1);
}
