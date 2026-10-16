import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Preserve textured labels, floor hit targets and instanced tiles. Static opaque
// props sharing a surface become one draw call without changing their geometry.
export function batchStatic(root:THREE.Group){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert();
 const groups=new Map<string,{material:THREE.MeshStandardMaterial;meshes:THREE.Mesh[]}>();
 root.traverse(object=>{
  const mesh=object as THREE.Mesh & {isInstancedMesh?:boolean;__r3f?:{eventCount?:number}};
  const m=mesh.material as THREE.MeshStandardMaterial;
  if(!mesh.isMesh||mesh.isInstancedMesh||mesh.__r3f?.eventCount||!m?.isMeshStandardMaterial||m.map||m.transparent)return;
  const key=[m.type,m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.side,mesh.castShadow,mesh.receiveShadow].join(':');
  const group=groups.get(key)??{material:m,meshes:[]};group.meshes.push(mesh);groups.set(key,group);
 });
 const batches:THREE.Mesh[]=[];const originals:{mesh:THREE.Mesh;visible:boolean}[]=[];
 for(const {material,meshes}of groups.values()){
  if(meshes.length<2)continue;
  const parts=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)));
  const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();
  if(!geometry)continue;
  const merged=new THREE.Mesh(geometry,material.clone());merged.castShadow=meshes[0].castShadow;merged.receiveShadow=meshes[0].receiveShadow;
  merged.name='AEGIS static surface batch';root.add(merged);batches.push(merged);
  for(const mesh of meshes){originals.push({mesh,visible:mesh.visible});mesh.visible=false;}
 }
 return {originals:originals.length,batches:batches.length,dispose(){for(const b of batches){root.remove(b);b.geometry.dispose();(b.material as THREE.Material).dispose();}for(const o of originals)o.mesh.visible=o.visible;}};
}
