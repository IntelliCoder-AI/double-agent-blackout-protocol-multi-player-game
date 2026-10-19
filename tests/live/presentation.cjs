const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const {observeSnapshots}=require('./observe.cjs');
const origin=process.env.BASE_URL||'https://double-agent-blackout-protocol-radhe12.vercel.app';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=40000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(250);}throw Error('Timeout '+label);}
(async()=>{
 await fs.mkdir('release-evidence',{recursive:true});
 const options={headless:true,executablePath:process.env.CHROME_EXECUTABLE||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']};
 const browser=await chromium.launch(options);const errors=[];let page,snap;const reports=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));observeSnapshots(page,s=>snap=s);
  await context.addInitScript(expected=>{if(location.origin!==expected)return;localStorage.setItem('aegis-quality','low');localStorage.setItem('aegis-audio','off');},new URL(origin).origin);
  await page.goto(origin);await page.getByText('SECURE LINK',{exact:true}).waitFor();await until(async()=>await page.locator('canvas').count()&&!(await page.getByText('INITIALIZING HEADQUARTERS…',{exact:true}).count()),'3D menu');
  await page.screenshot({path:'release-evidence/main-menu.png'});
  await page.getByRole('button',{name:'Practice with bot',exact:true}).click();await page.getByLabel('Operative callsign').fill('Presentation QA');await page.getByRole('button',{name:'Create practice mission',exact:true}).click();await until(()=>snap?.room?.phase==='lobby','lobby');await page.getByRole('button',{name:'Mark ready',exact:true}).click();await page.getByRole('button',{name:'Begin lockdown',exact:true}).click();await until(()=>snap.room.phase==='investigation','investigation');
  for(const quality of ['low','high']){
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Graphics',{exact:true}).selectOption(quality);await page.getByRole('button',{name:'Measure 10 seconds',exact:true}).click();await page.getByRole('button',{name:'Close panel',exact:true}).click();
   await page.keyboard.down('a');await sleep(4500);await page.keyboard.up('a');await page.keyboard.down('d');await sleep(4500);await page.keyboard.up('d');await sleep(2500);
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('.performance-readout').waitFor();const report=await page.locator('.performance-readout').innerText();reports.push({quality,report});await page.getByRole('button',{name:'Close panel',exact:true}).click();
  }
  await page.screenshot({path:'release-evidence/headquarters-gameplay.png'});
  await page.getByRole('button',{name:/Facility/}).click();await page.getByRole('button',{name:/Stabilize reactor/}).click();await until(()=>{const p=snap.room.players.find(p=>p.id===snap.self.id);return Math.hypot(p.x-15,p.z-12)<2.65;},'reactor route');
  await page.getByRole('button',{name:'Close station',exact:true}).click();await page.screenshot({path:'release-evidence/reactor.png'});
  await page.getByRole('button',{name:'Exit practice',exact:true}).click();await until(()=>!snap.room,'practice exit');
  assert.deepEqual(errors,[]);
  await fs.writeFile('release-evidence/performance.json',JSON.stringify({at:new Date().toISOString(),environment:'GitHub Actions Chromium with SwiftShader; CPU software rendering, not real phone/GPU benchmarks',samples:reports,pageErrors:errors},null,2));
  console.log(JSON.stringify({event:'presentation-performance',reports,pageErrors:errors}));
 }finally{await browser.close();}
 // Explicit unsupported-WebGL path: no infinite loading screen, working guest and practice.
 const fallback=await chromium.launch({...options,args:['--disable-webgl']});
 try{
  const p=await fallback.newPage({viewport:{width:1280,height:900}});await p.goto(origin);await p.getByText('SECURE LINK',{exact:true}).waitFor({timeout:45000});await p.getByRole('group',{name:'Live tactical facility map',exact:true}).waitFor();
  assert.equal(await p.getByText('INITIALIZING HEADQUARTERS…',{exact:true}).count(),0);
  await p.getByRole('button',{name:'Practice with bot',exact:true}).click();await p.getByLabel('Operative callsign').fill('Fallback QA');await p.getByRole('button',{name:'Create practice mission',exact:true}).click();await p.getByRole('button',{name:'Mark ready',exact:true}).click();await p.getByRole('button',{name:'Begin lockdown',exact:true}).click();await p.getByRole('button',{name:/Facility/}).waitFor({timeout:20000});
  await p.getByRole('button',{name:'Camera archive console',exact:true}).click();await p.getByRole('heading',{name:'Camera archive',exact:true}).waitFor();await p.getByRole('button',{name:'Approach console',exact:true}).click();
  await until(async()=>!(await p.getByRole('button',{name:'Approach console',exact:true}).count()),'tactical movement');
  await p.screenshot({path:'release-evidence/tactical-fallback.png'});await p.getByRole('button',{name:'Exit practice',exact:true}).click();console.log(JSON.stringify({event:'unsupported-webgl',liveMap:true,consoleSelection:true,serverValidatedWalking:true,guestConnected:true}));
 }finally{await fallback.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
