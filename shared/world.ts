export type Point = { x: number; z: number };
export const ROOMS = [
  { id: 'operations', name: 'Operations', x: 0, z: 0, w: 15, d: 12, color: '#69ecd2', number: '01' },
  { id: 'surveillance', name: 'Surveillance', x: -13, z: -10, w: 11, d: 10, color: '#87cbff', number: '02' },
  { id: 'vault', name: 'Server vault', x: 13, z: -10, w: 11, d: 10, color: '#91a2ff', number: '03' },
  { id: 'archives', name: 'Archives', x: -13, z: 10, w: 11, d: 10, color: '#f1c580', number: '04' },
  { id: 'reactor', name: 'Reactor', x: 13, z: 10, w: 11, d: 10, color: '#ff8068', number: '05' },
] as const;
export const STATIONS = [
  { id: 'footage', name: 'Camera archive', kind: 'evidence', x: -14, z: -12, room: 'surveillance' },
  { id: 'reader', name: 'Vault access log', kind: 'evidence', x: 11, z: -11, room: 'vault' },
  { id: 'clock', name: 'Clock receipt', kind: 'evidence', x: -11, z: -8, room: 'surveillance' },
  { id: 'manifest', name: 'Personnel manifest', kind: 'evidence', x: -14, z: 9, room: 'archives' },
  { id: 'frame', name: 'Frame signature', kind: 'evidence', x: -10, z: 12, room: 'archives' },
  { id: 'event', name: 'Core-bay recorder', kind: 'evidence', x: 15, z: -8, room: 'vault' },
  { id: 'verify-a', name: 'Verification terminal', kind: 'verify', x: -4, z: -3, room: 'operations' },
  { id: 'verify-b', name: 'Archive verifier', kind: 'verify', x: -16, z: 12, room: 'archives' },
  { id: 'repair-clock', name: 'Restore surveillance', kind: 'repair', x: -16, z: -8, room: 'surveillance' },
  { id: 'repair-uplink', name: 'Isolate uplink', kind: 'repair', x: 16, z: -12, room: 'vault' },
  { id: 'repair-reactor', name: 'Stabilize reactor', kind: 'repair', x: 15, z: 12, room: 'reactor' },
  { id: 'abort-a', name: 'Emergency abort', kind: 'abort', x: 5, z: 3, room: 'operations' },
  { id: 'abort-b', name: 'Emergency abort', kind: 'abort', x: 10, z: 8, room: 'reactor' },
  { id: 'exfil', name: 'External uplink', kind: 'exfil', x: 15, z: -13, room: 'vault' },
  { id: 'board', name: 'Living Evidence Wall', kind: 'board', x: 0, z: -3, room: 'operations' },
] as const;
export type StationId = typeof STATIONS[number]['id'];
export const COLORS = ['#83ecd5','#ffb683','#98adff','#f295cb','#d5e891','#f0d591','#91d4ed','#d4b6ef'];
export const OBSTACLES = [
  {x:0,z:0,w:5,d:2.8}, {x:13,z:9,w:2.6,d:2.6},
  {x:10,z:-13,w:1.3,d:3}, {x:13,z:-13,w:1.3,d:3},
  {x:-16.8,z:8,w:1,d:3}, {x:-16.8,z:12,w:1,d:2},
];
const FLOORS = [...ROOMS, {x:0,z:0,w:34,d:5}, {x:-13,z:0,w:5,d:24}, {x:13,z:0,w:5,d:24}];
export function walkable(p: Point) {
  return FLOORS.some(r => Math.abs(p.x-r.x)<r.w/2-.25 && Math.abs(p.z-r.z)<r.d/2-.25)
    && !OBSTACLES.some(o=>Math.abs(p.x-o.x)<o.w/2+.32 && Math.abs(p.z-o.z)<o.d/2+.32);
}
export function roomAt(p: Point) { return ROOMS.find(r=>Math.abs(p.x-r.x)<r.w/2&&Math.abs(p.z-r.z)<r.d/2)?.name ?? 'Transit'; }
export function distance(a: Point,b: Point) { return Math.hypot(a.x-b.x,a.z-b.z); }
export function move(p: Point, dx: number,dz: number,dt: number): Point {
  const norm=Math.max(1,Math.hypot(dx,dz)); const d=Math.min(dt,.1)*5.2;
  let q={x:p.x+dx/norm*d,z:p.z}; if(!walkable(q)) q={...p};
  const next={x:q.x,z:q.z+dz/norm*d}; return walkable(next)?next:q;
}
