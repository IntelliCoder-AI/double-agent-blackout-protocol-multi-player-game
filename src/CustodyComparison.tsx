import { Fingerprint, Eye, LockKeyhole } from 'lucide-react';
import type { PublicRoom } from '../shared/types';

/** Display only the published projection. Private records and roles never enter this component. */
export function CustodyComparison({room}:{room:PublicRoom}){
 const camera=room.board.find(c=>c.id==='footage'),receipt=room.board.find(c=>c.id==='reader');
 const authenticated=!!camera?.verified&&!!receipt?.verified;
 const common=authenticated?camera.candidates?.filter(id=>receipt.candidates?.includes(id))??[]:[];
 return <section className="custody-comparison" aria-label="Visual custody comparison">
  <div className="custody-heading"><span className="eyebrow mint">TWO FACTORS / ONE OPERATOR</span><small>Find the name in both groups. Authenticate each source first.</small></div>
  {[{record:camera,label:'CAMERA GROUP',Icon:Eye},{record:receipt,label:'ACCESS GROUP',Icon:Fingerprint}].map(({record,label,Icon})=><div className="custody-row" key={label}><span className="custody-label"><Icon size={18}/>{label}<small>{record?record.verified?'AUTHENTICATED':'AWAITING VERIFICATION':'NOT YET SHARED'}</small></span><div className="custody-tokens">{record?.candidates?.map(id=><span className={`custody-person ${common.includes(id)?'common':''}`} key={id}><Fingerprint size={18}/>{room.suspects.find(s=>s.id===id)?.name??id}</span>)??<span className="custody-locked"><LockKeyhole size={16}/> Recover and pin this source</span>}</div></div>)}
 </section>;
}
