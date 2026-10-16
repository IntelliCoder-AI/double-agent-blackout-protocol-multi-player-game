import type { IncomingMessage,ServerResponse } from 'node:http';
import pg from 'pg';
import { HostedGame, requestSchema } from '../server/hosted.js';
import { GameError } from '../server/engine.js';
import { readRequestBody, RequestTooLarge } from '../server/http-body.js';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:10000,statement_timeout:8000});
pool.on('error',()=>console.error('Database pool disconnected; next request will reconnect.'));
const game=new HostedGame(pool);
export default async function handler(req:IncomingMessage,res:ServerResponse){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status:number,body:unknown)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 try{
  const url=new URL(req.url??'/','https://localhost');const route=url.searchParams.get('route');
  if(route==='health'){await pool.query('SELECT id FROM game_private.hosted_world WHERE id=1');return send(200,{ok:true,transport:'https',version:'b2-five-cases'});}
  if(req.method!=='POST')return send(405,{error:'Method not allowed.'});
  if(!process.env.APP_ORIGIN||req.headers.origin!==process.env.APP_ORIGIN)return send(403,{error:'Origin rejected.'});
  const token=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-doubleagent='))?.slice('__Host-doubleagent='.length);
  if(route==='session'){
   const ip=String(req.headers['x-real-ip']??req.socket.remoteAddress??'unknown');const result=await game.session(token,ip);
   if(result.error)return send(429,{error:result.error});if(result.created)res.setHeader('Set-Cookie',`__Host-doubleagent=${result.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);
   return send(200,{ok:true});
  }
  if(route!=='sync')return send(404,{error:'Not found.'});
  const parsed=requestSchema.safeParse(await readRequestBody(req));
  if(!parsed.success)return send(400,{error:'Invalid request.'});
  return send(200,await game.sync(token,parsed.data));
 }catch(err){if(err instanceof RequestTooLarge)return send(413,{error:'Request too large.'});if(err instanceof GameError)return send(401,{type:'error',code:err.code,message:err.message});if(err instanceof SyntaxError)return send(400,{error:'Invalid JSON.'});console.error('Hosted request failed:',err instanceof Error?err.name:'unknown');return send(503,{error:'Headquarters is reconnecting. Please retry.'});}
}
