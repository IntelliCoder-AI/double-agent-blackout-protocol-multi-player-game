import { validSeat } from '../shared/seat';
const requested=new URLSearchParams(location.search).get('seat');
if(validSeat(requested))sessionStorage.setItem('aegis-seat',requested);
const saved=sessionStorage.getItem('aegis-seat');
export const seat=validSeat(saved)?saved:null;
export const seatHeaders:Record<string,string>=seat?{'X-Player-Seat':seat}:{};
export function newPlayerUrl(code?:string){
 const url=new URL('/',location.origin);url.searchParams.set('seat',crypto.randomUUID());
 if(code)url.searchParams.set('room',code);return url.toString();
}
