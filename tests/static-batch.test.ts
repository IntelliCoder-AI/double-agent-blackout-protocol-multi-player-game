import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStatic } from '../src/static-batch';

test('static batching preserves transformed surfaces and interactive meshes while reducing draws',()=>{
 const root=new THREE.Group();root.position.set(7,0,-3);root.rotation.y=.3;
 const props=new THREE.Group();props.rotation.y=.5;root.add(props);
 for(let i=0;i<30;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial({color:i%2?'#123456':'#abcdef'}));mesh.position.set(i*2,1,0);mesh.castShadow=true;mesh.receiveShadow=true;props.add(mesh);}
 const hit=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());Object.assign(hit,{__r3f:{eventCount:1}});root.add(hit);
 const label=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());root.add(label);
 root.updateWorldMatrix(true,true);const before=new THREE.Box3().setFromObject(props,true);
 const batch=batchStatic(root);assert.equal(batch.originals,30);assert.equal(batch.batches,2);assert.equal(hit.visible,true);assert.equal(label.visible,true);
 const after=new THREE.Box3();root.updateWorldMatrix(true,true);for(const m of root.children.filter(c=>c.name==='AEGIS static surface batch'))after.union(new THREE.Box3().setFromObject(m,true));
 assert.ok(before.min.distanceTo(after.min)<.0001);assert.ok(before.max.distanceTo(after.max)<.0001);
 batch.dispose();assert.equal(props.children.every(c=>c.visible),true);assert.equal(root.children.filter(c=>c.name==='AEGIS static surface batch').length,0);
});
