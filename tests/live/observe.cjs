// Observe the same public projection over either supported transport.
function observeSnapshots(page,consume){
 page.on('response',async response=>{
  if(new URL(response.url()).pathname!=='/api/sync')return;
  try{const body=await response.json();if(body.snapshot)consume(body.snapshot);}catch{}
 });
 page.on('websocket',socket=>socket.on('framereceived',event=>{
  try{const body=JSON.parse(event.payload.toString());if(body.type==='snapshot')consume(body);}catch{}
 }));
}
module.exports={observeSnapshots};
