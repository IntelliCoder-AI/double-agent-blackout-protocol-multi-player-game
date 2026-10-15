import { createServer, type IncomingMessage } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { Engine, GameError } from './engine';
import { Store } from './store';
import type { Command } from '../shared/types';

export async function startServer(options:{port?:number;origin?:string;databaseUrl?:string;production?:boolean;engine?:Engine;frontend?:boolean}={}){
 const production=options.production??process.env.NODE_ENV==='production';const port=options.port??Number(process.env.PORT??3000);
 const origin=options.origin??process.env.APP_ORIGIN??`http://localhost:${port}`;
 if(production&&(!process.env.DATABASE_URL||!process.env.APP_ORIGIN))throw Error('Production requires DATABASE_URL and APP_ORIGIN.');
 if(production&&(new URL(origin).protocol!=='https:'||new URL(origin).origin!==origin))throw Error('APP_ORIGIN must be an exact HTTPS origin without a trailing slash or path.');
 const databaseUrl=options.databaseUrl??process.env.DATABASE_URL??'file:.data/local-postgres';
 if(production&&!databaseUrl.startsWith('postgres'))throw Error('Production requires a dedicated PostgreSQL service. Embedded storage is for development/tests only.');
 const store=new Store(databaseUrl);
 if(!production)await store.migrate();await store.check();await store.claimOwnership();const engine=options.engine??new Engine();
 for(const room of await store.load()){room.players.forEach(p=>{p.connected=false;p.lastSeen=Date.now();p.dx=0;p.dz=0;});if(room.round&&room.round.phase!=='results')engine.finish(room,'none','The server restarted during this mission. Your room and scores are safe; start a rematch.',Date.now());engine.rooms.set(room.code,room);}
 const cookieName=production?'__Host-doubleagent':'doubleagent';const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const cookies=(req:IncomingMessage)=>Object.fromEntries((req.headers.cookie??'').split(';').map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1)];}));
 const buckets=new Map<string,{tokens:number;at:number}>();const rate=(key:string,limit:number,period:number)=>{const now=Date.now();const b=buckets.get(key)??{tokens:limit,at:now};b.tokens=Math.min(limit,b.tokens+(now-b.at)*limit/period);b.at=now;if(b.tokens<1){buckets.set(key,b);return false;}b.tokens--;buckets.set(key,b);return true;};
 let stopping=false,dbHealthy=true,processing=false;let queue=Promise.resolve();const serialize=(f:()=>Promise<void>)=>{queue=queue.then(async()=>{processing=true;try{await f();}finally{processing=false;}}).catch(e=>console.error('Operation failed:',e instanceof Error?e.message:'unknown'));return queue;};
 let vite:any=null;
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',production?"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'":"default-src 'self' 'unsafe-inline'; connect-src 'self' ws:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'");
  const send=(status:number,obj:unknown)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj));};
  try{
   if(req.url==='/health/live')return send(200,{ok:true});
   if(req.url==='/health/ready'){try{await store.check();return send(stopping?503:200,{ok:!stopping});}catch{return send(503,{ok:false});}}
   if(req.url==='/api/session'&&req.method==='POST'){
    if(req.headers.origin!==origin)return send(403,{error:'Origin rejected.'});
    if(!rate('session:'+req.socket.remoteAddress,60,60000))return send(429,{error:'Please wait before reconnecting.'});
    return void serialize(async()=>{try{const token=cookies(req)[cookieName];const existing=token?await store.session(hash(token)):undefined;
      if(existing)return send(200,{ok:true});const fresh=randomBytes(32).toString('base64url');await store.newSession(randomUUID(),hash(fresh));
      res.setHeader('Set-Cookie',`${cookieName}=${fresh}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${production?'; Secure':''}`);send(200,{ok:true});
    }catch{send(503,{error:'Guest session unavailable. Please retry.'});}});
   }
   if(req.url?.startsWith('/api/'))return send(404,{error:'Not found.'});
   if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed.'});
   if(vite){vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});return;}
   if(options.frontend===false)return send(404,{error:'No frontend in this test server.'});
   const root=resolve('dist');const pathname=decodeURIComponent((req.url??'/').split('?')[0]);let file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep))return send(403,{error:'Forbidden.'});
   try{if(!(await stat(file)).isFile())file=resolve(root,'index.html');}catch{file=resolve(root,'index.html');}
   const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
   res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.setHeader('Cache-Control',file.includes(sep+'assets'+sep)?'public,max-age=31536000,immutable':'no-cache');res.end(await readFile(file));
  }catch(e){console.error('HTTP request failed');if(!res.headersSent)send(503,{error:'Headquarters is reconnecting. Please retry.'});else res.end();}
 });
 if(!production&&options.frontend!==false){const {createServer:createVite}=await import('vite');vite=await createVite({server:{middlewareMode:true,hmr:{server}},appType:'spa'});}
 const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false});
 const clients=new Map<string,WebSocket>();const alive=new WeakMap<WebSocket,number>();
 const safeSend=(ws:WebSocket,value:unknown)=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256*1024){ws.close(1013,'Connection too slow. Reconnecting.');return;}ws.send(JSON.stringify(value));}};
 const broadcast=()=>{for(const [session,ws]of clients)safeSend(ws,engine.snapshot(session));};
 const envelope=z.object({id:z.uuid(),type:z.string().max(40),roundId:z.string().nullable().optional(),payload:z.record(z.string(),z.unknown()).optional()}).strict();
 server.on('upgrade',async(req,socket,head)=>{
  if((req.url??'').split('?')[0]!=='/ws'){if(!vite)socket.destroy();return;}
  socket.on('error',()=>{});
  try{if(stopping||!dbHealthy||req.headers.origin!==origin||!rate('upgrade:'+req.socket.remoteAddress,120,60000)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
   const token=cookies(req)[cookieName],session=token?await store.session(hash(token)):undefined;if(!session){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}
   wss.handleUpgrade(req,socket,head,ws=>{let queued=0;const old=clients.get(session.id);clients.set(session.id,ws);if(old)old.close(4001,'This session opened another connection.');alive.set(ws,Date.now());void serialize(async()=>{if(clients.get(session.id)===ws){engine.connected(session.id,true);safeSend(ws,engine.snapshot(session.id));}});
    ws.on('error',()=>{});ws.on('pong',()=>alive.set(ws,Date.now()));
    ws.on('close',()=>{void serialize(async()=>{if(clients.get(session.id)===ws){clients.delete(session.id);engine.connected(session.id,false);broadcast();}});});
    ws.on('message',raw=>{if(!rate(session.id+':ingress',60,1000)||queued>=32){ws.close(1008,'Too many pending commands.');return;}queued++;void serialize(async()=>{
      let id='';try{
       if(clients.get(session.id)!==ws||session.expires_at.getTime()<=Date.now())throw new GameError('SESSION_EXPIRED','Your guest session expired. Reload to reconnect.');
       const parsed=envelope.safeParse(JSON.parse(raw.toString()));if(!parsed.success)throw new GameError('INVALID_PAYLOAD','Invalid message.');const cmd=parsed.data as Command;id=cmd.id;
       const movement=cmd.type==='input.move';const bucket=movement?'move':['chat','quick'].includes(cmd.type)?'chat':cmd.type==='evidence.compare'?'compare':'action';
       const limits={move:[30,1000],chat:[4,10000],compare:[2,10000],action:[10,1000]}[bucket]!;
       if(!rate(session.id+':'+bucket,limits[0],limits[1]))throw new GameError('RATE_LIMIT','Please slow down.');
       if(cmd.type==='room.create'&&!rate(session.id+':create',5,600000))throw new GameError('RATE_LIMIT','Too many missions created.');
       if(cmd.type==='room.join'&&!rate(session.id+':join',10,60000))throw new GameError('RATE_LIMIT','Too many join attempts.');
       if(movement){engine.command(session.id,cmd);return;}
       const digest=hash(JSON.stringify(cmd));const receipt=await store.receipt(session.id,id);if(receipt){if(receipt.payload_hash!==digest)throw new GameError('REPLAY_MISMATCH','Command identifier was reused.');safeSend(ws,receipt.response);safeSend(ws,engine.snapshot(session.id));return;}
       const backup=structuredClone([...engine.rooms.entries()]);
       try{engine.command(session.id,cmd);const response={type:'ack',id};await store.persist([...engine.rooms.values()],{session:session.id,id,hash:digest,response});dbHealthy=true;safeSend(ws,response);broadcast();}
       catch(e){engine.rooms=new Map(backup);throw e;}
      }catch(e){const error=e instanceof GameError?e:new GameError('SERVER_ERROR','Action could not be committed. Please retry.');safeSend(ws,{type:'error',id,code:error.code,message:error.message});}finally{queued--;}
    });});
   });
  }catch{socket.destroy();}
 });
 let lastTick=Date.now(),ticking=false;
 const simulation=setInterval(()=>{if(ticking||stopping)return;ticking=true;void serialize(async()=>{try{const now=Date.now(),backup=structuredClone([...engine.rooms.entries()]);const dirty=engine.tick(now,Math.min(.1,(now-lastTick)/1000));lastTick=now;if(dirty){try{await store.persist([...engine.rooms.values()]);dbHealthy=true;}catch{engine.rooms=new Map(backup);dbHealthy=false;for(const ws of clients.values())safeSend(ws,{type:'error',code:'DATABASE_UNAVAILABLE',message:'Database unavailable. Reconnecting safely.'});}}}finally{ticking=false;}});},50);
 const sync=setInterval(()=>{if(!stopping&&dbHealthy&&!processing)broadcast();},100);
 const heartbeat=setInterval(()=>{for(const [id,ws]of clients){if(Date.now()-(alive.get(ws)??0)>15000){ws.terminate();continue;}ws.ping();}for(const[key,b]of buckets)if(Date.now()-b.at>600000)buckets.delete(key);},5000);
 const cleanup=setInterval(()=>void serialize(()=>store.cleanup()),60000);
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,production?'0.0.0.0':'127.0.0.1',resolve);});
 console.log(`DOUBLE AGENT running at ${origin}`);
 return {server,engine,store,close:async()=>{stopping=true;clearInterval(simulation);clearInterval(sync);clearInterval(heartbeat);clearInterval(cleanup);await queue;await store.persist([...engine.rooms.values()]);for(const ws of clients.values())ws.close(1012,'Server maintenance. Reconnect shortly.');wss.close();if(vite)await vite.close();await new Promise<void>(r=>server.close(()=>r()));await store.close();}};
}
if(process.argv[1]?.endsWith('index.ts')||process.argv[1]?.endsWith('index.js')){
 startServer().then(app=>{let closing=false;const stop=()=>{if(!closing){closing=true;void app.close().then(()=>process.exit(0));}};process.on('SIGTERM',stop);process.on('SIGINT',stop);}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
