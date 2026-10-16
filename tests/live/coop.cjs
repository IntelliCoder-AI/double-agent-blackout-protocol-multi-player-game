const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const origin=process.env.BASE_URL||'https://double-agent-blackout-protocol-radhe12.vercel.app';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(event,data={})=>console.log(JSON.stringify({at:new Date().toISOString(),event,...data}));
async function until(fn,label,ms=15000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(250);}throw Error('Timeout: '+label);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||undefined});
 const clients=[];const errors=[];const latencies=[];
 try{
  for(const name of ['Smoke Cipher','Smoke Echo']){
   const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();page.setDefaultTimeout(12000);
   const c={name,context,page,snap:null};clients.push(c);
   page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.url().endsWith('/api/sync'))try{const d=await r.json();if(d.snapshot)c.snap=d.snapshot;const t=r.request().timing().responseEnd;if(t>0)latencies.push(t);}catch{}});
   await page.goto(origin);await page.getByText('SECURE LINK',{exact:true}).waitFor();
  }
  const [a,b]=clients;await a.page.getByRole('button',{name:'Create mission',exact:true}).click();await a.page.getByLabel('Operative callsign').fill(a.name);await a.page.getByRole('button',{name:'Create secure room'}).click();await until(()=>a.snap?.room,'created');const code=a.snap.room.code;
  await b.page.getByRole('button',{name:'Join with code',exact:true}).click();await b.page.getByPlaceholder('Your callsign').fill(b.name);await b.page.getByPlaceholder('AEGIS7').fill(code);await b.page.getByRole('button',{name:'Join mission',exact:true}).click();await until(()=>b.snap?.room?.players.length===2,'joined');log('create-join',{code});
  await a.page.getByRole('button',{name:'Mark ready'}).click();await b.page.getByRole('button',{name:'Mark ready'}).click();await a.page.getByRole('button',{name:'Begin lockdown'}).click();await until(()=>a.snap.room.phase==='investigation'&&b.snap.room.phase==='investigation','investigation',20000);log('roles',{roles:clients.map(c=>c.snap.self.role),grants:clients.map(c=>c.snap.self.grants)});
  async function dismiss(c){if(await c.page.getByRole('button',{name:'Close panel',exact:true}).count())await c.page.getByRole('button',{name:'Close panel',exact:true}).click();}
  async function go(c,name){await dismiss(c);await c.page.getByRole('button',{name:/Facility/}).click();await c.page.getByRole('button',{name:new RegExp(name)}).click();if(await c.page.getByRole('button',{name:'Approach console'}).count())await c.page.getByRole('button',{name:'Approach console'}).click();await until(async()=>!(await c.page.getByRole('button',{name:'Approach console'}).count()),'arrive '+name,45000);await sleep(1200);log('arrived',{player:c.name,station:name});}
  async function scan(c,id,name){await go(c,name);await until(()=>c.snap.self.grants.includes(id)||c.snap.room.elapsed>=120000,'shared recovery '+id,125000);await c.page.getByRole('button',{name:'Recover record',exact:true}).click();await until(()=>c.snap.self.clues.some(x=>x.id===id),'scan '+id,12000);log('scan',{player:c.name,id});}
  async function verify(c,ids){await go(c,'^Verification terminal');for(const id of ids){await c.page.getByLabel('Evidence to verify').selectOption(id);await c.page.getByRole('button',{name:'Authenticate source'}).click();await until(()=>c.snap.self.clues.some(x=>x.id===id&&x.verified),'verify '+id,12000);log('verify',{player:c.name,id});}}
  async function publish(c,ids){await dismiss(c);await c.page.getByRole('button',{name:/Evidence Wall/}).click();if(await c.page.getByRole('button',{name:'Walk to the wall'}).count()){await c.page.getByRole('button',{name:'Walk to the wall'}).click();await until(()=>{const p=c.snap.room.players.find(p=>p.id===c.snap.self.id);return Math.hypot(p.x,p.z+3)<2.4;},'wall arrival',20000);await c.page.getByRole('button',{name:/Evidence Wall/}).click();}for(const id of ids){await c.page.getByLabel('Private record to publish').selectOption(id);await c.page.getByRole('button',{name:'Pin to wall'}).click();await until(()=>c.snap.room.board.some(x=>x.id===id),'publish '+id);log('publish',{player:c.name,id});}}
  const footageOwner=clients.find(c=>c.snap.self.grants.includes('footage'));const readerOwner=clients.find(c=>c.snap.self.grants.includes('reader'));
  await Promise.all([
   (async()=>{await scan(footageOwner,'footage','Camera archive');await scan(footageOwner,'clock','Clock receipt');await verify(footageOwner,['footage','clock']);await publish(footageOwner,['footage','clock']);})(),
   (async()=>{await go(readerOwner,'Isolate uplink');for(const [i,label]of ['○','△','◇'].entries()){await readerOwner.page.getByRole('button',{name:label,exact:true}).click();await until(()=>readerOwner.snap.room.repairs['repair-uplink'].step>=i+1,'repair step');await sleep(1100);}log('repair',{complete:readerOwner.snap.room.repairs['repair-uplink'].complete});await scan(readerOwner,'reader','Vault access log');await scan(readerOwner,'event','Core-bay recorder');await verify(readerOwner,['reader','event']);await publish(readerOwner,['reader','event']);})()
  ]);
  await until(()=>clients.every(c=>c.snap.room.board.length===4),'board synchronized');const wall=footageOwner.page;
  for(const [comparison,value]of [['time','02:14:00'],['event','E-401']]){await wall.getByLabel('Comparison',{exact:true}).selectOption(comparison);await wall.getByLabel('Supporting value').fill(value);await wall.getByRole('button',{name:'Verify connection',exact:true}).click();await until(()=>footageOwner.snap.room.links.length>=(comparison==='time'?1:2),'supported link');}
  log('evidence-wall',{records:a.snap.room.board.length,links:footageOwner.snap.room.links.length});await wall.screenshot({path:'live-evidence-wall.png'});
  const sources=footageOwner.snap.room.board;const camera=sources.find(c=>c.id==='footage'),reader=sources.find(c=>c.id==='reader');const culprit=camera.candidates.find(id=>reader.candidates.includes(id));log('solution-from-published-records',{culprit});
  const idBefore=a.snap.self.id;await a.page.reload();await until(()=>a.snap.self.id===idBefore,'reconnect');log('reconnect',{sameIdentity:true});
  await until(()=>clients.every(c=>c.snap.room.phase==='vote'),'vote phase',360000);
  for(const c of clients){await c.page.getByLabel('Suspected double agent').selectOption(culprit);await c.page.getByLabel('Supporting published evidence').selectOption('footage');await c.page.getByRole('button',{name:'Submit indictment'}).click();await until(()=>c.snap.self.voteSubmitted,'ballot');}
  await until(()=>clients.every(c=>c.snap.room.phase==='results'),'results',45000);log('result',{winner:a.snap.room.result.winner,reason:a.snap.room.result.reason});await a.page.screenshot({path:'live-results.png'});
  const host=clients.find(c=>c.snap.self.id===c.snap.room.hostId);log('results-buttons',{buttons:await host.page.getByRole('button').allTextContents()});await host.page.getByRole('button',{name:/Play again/i}).click();await until(()=>clients.every(c=>c.snap.room.phase==='lobby'),'rematch');log('rematch',{sameCode:clients.every(c=>c.snap.room.code===code)});for(const c of clients)await c.page.getByRole('button',{name:'Leave mission',exact:true}).click();
  latencies.sort((a,b)=>a-b);log('complete',{errors,requests:latencies.length,medianMs:latencies[Math.floor(latencies.length/2)],p95Ms:latencies[Math.floor(latencies.length*.95)]});
 }catch(e){log('failed',{error:e.message});for(const [i,c]of clients.entries()){console.log('CLIENT '+i+' '+(await c.page.locator('body').innerText()).slice(-4000));await c.page.screenshot({path:'live-failure-'+i+'.png'});}process.exitCode=1;}finally{await browser.close();}
})();
