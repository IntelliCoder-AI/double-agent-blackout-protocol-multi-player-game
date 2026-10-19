// Normal-duration Case 01: private identity source, advisory bot abstention, solo runoff verdict.
const {chromium}=require('playwright');
const {observeSnapshots}=require('./observe.cjs');
const assert=require('node:assert/strict');
const origin=process.env.BASE_URL||'https://double-agent-blackout-protocol-radhe12.vercel.app';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=40000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(250);}throw Error('Timeout: '+label);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],executablePath:process.env.CHROME_EXECUTABLE||undefined});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];let snap;
 page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));observeSnapshots(page,snapshot=>snap=snapshot);
 await context.addInitScript(expected=>{if(location.origin!==expected)return;localStorage.setItem('aegis-quality','low');localStorage.setItem('aegis-audio','off');},new URL(origin).origin);
 try{
  await page.goto(origin);await page.getByText('SECURE LINK',{exact:true}).waitFor();
  await until(async()=>await page.locator('canvas').count()&&!(await page.getByText('INITIALIZING HEADQUARTERS…',{exact:true}).count()),'3D startup');
  // Real context-loss event; the mission hook must survive renderer replacement.
  await page.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await page.getByRole('button',{name:'Retry 3D in performance mode'}).click();
  await until(async()=>await page.locator('canvas').count()&&!(await page.getByText('INITIALIZING HEADQUARTERS…',{exact:true}).count()),'3D recovery');
  await page.getByRole('button',{name:'Practice with bot',exact:true}).click();await page.getByLabel('Operative callsign').fill('Case 01 Regression');
  await page.getByRole('button',{name:'Create practice mission',exact:true}).click();await until(()=>snap?.room?.phase==='lobby','lobby');
  await page.getByRole('button',{name:'Mark ready',exact:true}).click();await page.getByRole('button',{name:'Begin lockdown',exact:true}).click();await until(()=>snap?.room?.phase==='investigation','investigation');
  const self=()=>snap.room.players.find(p=>p.id===snap.self.id);
  const before={x:self().x,z:self().z};await page.keyboard.down('d');await sleep(900);await page.keyboard.up('d');await until(()=>Math.hypot(self().x-before.x,self().z-before.z)>.1,'WASD movement');
  const humanIdentity=snap.self.grants.includes('footage')?'footage':'reader';
  await page.getByRole('button',{name:/Facility/}).click();
  await page.getByRole('button',{name:new RegExp(humanIdentity==='footage'?'Camera archive':'Vault access log')}).click();
  const recover=page.getByRole('button',{name:'Recover record',exact:true});
  await until(async()=>await recover.isVisible(),'physical approach',60000);await recover.click();await until(()=>snap.self.clues.some(c=>c.id===humanIdentity),'private identity record');
  // Keep this source private: ATLAS cannot invent the unpublished corroboration.
  await page.getByRole('button',{name:/Evidence Wall/}).click();await until(()=>snap.room.board.length>0,'bot published source',100000);
  await page.getByRole('button',{name:'Ask team to verify source',exact:true}).click();
  await until(()=>snap.room.chat.some(c=>c.name==='ATLAS / BOT'&&c.text.startsWith('Requested source is already authenticated')),'ATLAS request response');
  const walk=page.getByRole('button',{name:'Walk to the wall',exact:true});if(await walk.isVisible()){await walk.click();await until(()=>Math.hypot(self().x,self().z+3)<.6,'walk to wall',60000);await page.getByRole('button',{name:/Evidence Wall/}).click();}
  await page.getByLabel('Supporting value',{exact:true}).fill('02:14:30');
  await until(()=>!!snap.room.notice?.text.includes('Upload aborted'),'ATLAS physical abort',220000);await page.getByText('Upload aborted.',{exact:false}).first().waitFor();
  await until(()=>snap.room.phase==='discussion','normal discussion',120000);assert.equal(await page.getByLabel('Supporting value',{exact:true}).inputValue(),'02:14:30');
  await until(()=>snap.room.phase==='vote','ballot',65000);
  const camera=[...snap.room.board,...snap.self.clues].find(c=>c.id==='footage'),reader=[...snap.room.board,...snap.self.clues].find(c=>c.id==='reader');
  const candidates=camera.candidates.filter(id=>reader.candidates.includes(id));assert.equal(candidates.length,1);
  assert.ok(!snap.room.board.some(c=>c.id===humanIdentity),'private source must remain private');await until(()=>snap.room.chat.some(c=>c.text.startsWith('I abstained:')),'visible bot abstention');
  const source=snap.room.board[0].id;
  await page.getByLabel('Suspected double agent').selectOption(candidates[0]);await page.getByLabel('Supporting published evidence').selectOption(source);
  // Abstain once to exercise the actual runoff and retained selections.
  await page.getByRole('button',{name:'Abstain',exact:true}).click();await page.locator('.ballot-receipt').getByText('Vote cast: Abstain.',{exact:false}).waitFor();
  await until(()=>snap.room.phase==='runoff','runoff',45000);
  assert.equal(await page.getByLabel('Suspected double agent').inputValue(),candidates[0]);assert.equal(await page.getByLabel('Supporting published evidence').inputValue(),source);assert.equal(await page.getByLabel('Supporting value',{exact:true}).inputValue(),'02:14:30');
  await page.getByRole('button',{name:'Submit indictment',exact:true}).click();await page.locator('.ballot-receipt').getByText('Vote cast:',{exact:false}).waitFor();
  await until(()=>snap.room.phase==='results','solo verdict',25000);assert.equal(snap.room.result.winner,'agents');
  await page.getByRole('button',{name:'Play again',exact:true}).click();await until(()=>snap.room.phase==='lobby','rematch');await page.getByRole('button',{name:'Leave mission',exact:true}).click();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({event:'practice-regression',singleHumanVerdict:true,botAbstention:true,botAbort:true,quickVerify:true,wasd:true,graphicsContextRecovery:true,draftRetention:true,retainedBallot:true,pageErrors:errors}));
 }catch(e){console.log(JSON.stringify({event:'practice-regression-failed',error:e.message,errors,phase:snap?.room?.phase,body:(await page.locator('body').innerText().catch(()=>'')).slice(-6000)}));process.exitCode=1;}
 finally{await browser.close();}
})();
