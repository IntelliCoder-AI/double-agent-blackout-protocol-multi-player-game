import test from 'node:test';
import assert from 'node:assert/strict';
import { pathTo } from '../src/path';
import { move, distance, STATIONS } from '../shared/world';

test('hosted steering traverses corridor corners between consoles with delayed updates',()=>{
 for(const latency of [.2,.35,.5]){
  let player={x:-3,z:3.5};
  for(const id of ['footage','clock','verify-a','repair-uplink','reader','event','verify-a','board']){
   const station=STATIONS.find(s=>s.id===id)!;const destination={x:station.x,z:station.z+.8};
   const route=pathTo(player,destination);assert.ok(route.length,`route ${id}`);
   let elapsed=0;
   while(route.length&&elapsed<60){
    if(distance(player,route[0])<.08){route.shift();continue;}
    const next=route[0],divisor=Math.max(distance(player,next),2.6);
    const x=(next.x-player.x)/divisor,z=(next.z-player.z)/divisor;
    for(let t=0;t<latency-.001;t+=.05)player=move(player,x,z,.05);
    elapsed+=latency;
   }
   assert.equal(route.length,0,`stuck approaching ${id} at ${latency}s: ${JSON.stringify(player)}`);
   assert.ok(distance(player,station)<2.65,`interaction range ${id}`);
  }
 }
});

test('click-to-walk finishes at the Evidence Wall rather than one grid cell short',()=>{
 const destination={x:0,z:-3};
 for(const start of [{x:-4,z:-2.2},{x:15,z:-7.2},{x:-3,z:3.5}]){
  const route=pathTo(start,destination);assert.ok(route.length);assert.deepEqual(route[route.length-1],destination);
 }
});
