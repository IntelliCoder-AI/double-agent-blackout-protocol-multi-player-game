// A public cookie namespace, never an authentication token. Each namespace's
// actual guest credential stays in a separate HttpOnly cookie.
export function validSeat(value:string|null|undefined):value is string {
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function seatCookie(production:boolean,seat?:string|null){
 if(seat&&!validSeat(seat))throw Error('Invalid player seat.');
 return (production?'__Host-doubleagent':'doubleagent')+(seat?'-'+seat:'');
}
