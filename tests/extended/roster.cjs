// Eight independent Chromium guest contexts against the actual public HTTPS backend.
// Use the supported live tactical renderer to isolate networking from eight simultaneous
// software GPU contexts on a CPU-only CI runner. Separate suites verify actual 3D.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {observeSnapshots}=require('../live/observe.cjs');
const origin=process.env.BASE_URL||'https://double-agent-blackout-protocol-radhe12.vercel.app';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=40000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(250);}throw Error('Timeout '+label);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-webgl']});const clients=[],errors=[],latencies=[];await fs.mkdir('extended-evidence',{recursive:true});
 const observe=(c,page)=>{c.page=page;page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));observeSnapshots(page,s=>c.snap=s);page.on('response',r=>{if(new URL(r.url()).pathname==='/api/sync'){const t=r.request().timing().responseEnd;if(t>0)latencies.push(t);}});};
 try{
  for(let i=0;i<8;i++){
   const context=await browser.newContext({viewport:{width:1280,height:900}}),c={context,page:null,snap:null};clients.push(c);observe(c,await context.newPage());
   await context.addInitScript(expected=>{if(location.origin!==expected)return;localStorage.setItem('aegis-quality','low');localStorage.setItem('aegis-audio','off');},new URL(origin).origin);
   await c.page.goto(origin);await c.page.getByText('SECURE LINK',{exact:true}).waitFor();
   await c.page.getByRole('button',{name:i===0?'Create mission':'Join with code',exact:true}).click();await c.page.getByLabel('Operative callsign').fill('QA Operative '+(i+1));
   if(i===0){await c.page.getByRole('button',{name:/Social deduction/}).click();await c.page.getByRole('button',{name:'Create secure room',exact:true}).click();}
   else{await c.page.getByLabel('Six-character mission code').fill(clients[0].snap.room.code);await c.page.getByRole('button',{name:'Join mission',exact:true}).click();}
   await until(()=>c.snap?.room,'join '+i);
  }
  await until(()=>clients.every(c=>c.snap.room.players.length===8),'eight synchronized players');await clients[0].page.screenshot({path:'extended-evidence/eight-player-lobby.png'});
  for(const c of clients)await c.page.getByRole('button',{name:'Mark ready',exact:true}).click();await clients[0].page.getByRole('button',{name:'Begin lockdown',exact:true}).click();await until(()=>clients.every(c=>c.snap.room.phase==='investigation'),'eight-player start');
  assert.equal(clients.filter(c=>c.snap.self.role==='traitor').length,1);
  for(const c of clients){assert.ok(!('roles' in c.snap.room));assert.ok(!('culprit' in c.snap.room));assert.ok(c.snap.room.players.every(p=>!('role' in p)&&!('session' in p)));}
  const owner=clients.find(c=>c.snap.self.grants.includes('reader'));
  async function go(c,name){const close=c.page.getByRole('button',{name:'Close panel',exact:true});if(await close.count())await close.click();await c.page.getByRole('button',{name:/Facility/}).click();await c.page.getByRole('button',{name:new RegExp(name)}).click();await c.page.getByRole('heading',{name:new RegExp(name)}).waitFor();await until(async()=>!(await c.page.getByRole('button',{name:'Approach console',exact:true}).count()),'walk '+name,60000);}
  await go(owner,'Vault access log');await owner.page.getByRole('button',{name:'Recover record',exact:true}).click();await until(()=>owner.snap.self.clues.some(c=>c.id==='reader'),'scan source');
  await owner.page.getByRole('button',{name:/Evidence Wall/}).click();await owner.page.getByRole('button',{name:'Walk to the wall',exact:true}).click();await until(()=>{const p=owner.snap.room.players.find(p=>p.id===owner.snap.self.id);return Math.hypot(p.x,p.z+3)<.6;},'wall arrival',60000);await owner.page.getByRole('button',{name:/Evidence Wall/}).click();await owner.page.getByLabel('Private record to publish').selectOption('reader');await owner.page.getByRole('button',{name:'Pin to wall',exact:true}).click();await until(()=>clients.every(c=>c.snap.room.board.some(e=>e.id==='reader')),'published source synchronization');
  // An eight-second outage must preserve this guest's identity and private role.
  const weak=clients[7],id=weak.snap.self.id,role=weak.snap.self.role;await weak.context.setOffline(true);await sleep(8000);await weak.context.setOffline(false);await weak.page.getByText('SECURE LINK',{exact:true}).waitFor();await until(()=>weak.snap?.self?.id===id,'network recovery');assert.equal(weak.snap.self.role,role);
  // Actual host departure and return, without a new room or role assignment.
  const host=clients[0],hostId=host.snap.self.id,hostRole=host.snap.self.role;await host.page.close();await until(()=>clients[1].snap.room.hostId!==hostId,'host migration');observe(host,await host.context.newPage());host.snap=null;await host.page.goto(origin);await host.page.getByText('SECURE LINK',{exact:true}).waitFor();await until(()=>host.snap?.self?.id===hostId,'host reconnect');assert.equal(host.snap.self.role,hostRole);
  await until(()=>clients.every(c=>c.snap.room.phase==='vote'),'normal-duration social ballot',360000);
  const culprit=clients.find(c=>c.snap.self.role==='traitor').snap.self.id; // Observer knows each separate test guest's own role.
  for(const c of clients){await c.page.getByLabel('Suspected double agent').selectOption(culprit);await c.page.getByLabel('Supporting published evidence').selectOption('reader');await c.page.getByRole('button',{name:'Submit indictment',exact:true}).click();await until(()=>c.snap.self.voteSubmitted,'private ballot receipt');}
  await until(()=>clients.every(c=>c.snap.room.phase==='results'),'social verdict',45000);assert.ok(clients.every(c=>c.snap.room.result.winner==='agents'));await clients[1].page.screenshot({path:'extended-evidence/eight-player-results.png'});
  const nextHost=clients.find(c=>c.snap.self.id===c.snap.room.hostId);await nextHost.page.getByRole('button',{name:'Play again',exact:true}).click();await until(()=>clients.every(c=>c.snap.room.phase==='lobby'),'eight-player rematch');for(const c of clients)await c.page.getByRole('button',{name:'Leave mission',exact:true}).click();
  assert.deepEqual(errors,[]);latencies.sort((a,b)=>a-b);const report={event:'eight-player-public',independentContexts:8,privateTraitors:1,outageSeconds:8,hostMigration:true,reconnect:true,synchronizedBoard:true,privateBallots:true,agentsWin:true,rematch:true,pageErrors:errors,syncResponses:latencies.length,medianMs:latencies[Math.floor(latencies.length/2)],p95Ms:latencies[Math.floor(latencies.length*.95)]};await fs.writeFile('extended-evidence/roster.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }catch(e){console.error(e);for(const [i,c]of clients.entries())if(c.page&&!c.page.isClosed())console.log(JSON.stringify({client:i,phase:c.snap?.room?.phase,body:(await c.page.locator('body').innerText().catch(()=>'')).slice(-2500)}));process.exitCode=1;}
 finally{await browser.close();}
})();
