import type {IncomingMessage} from 'node:http';
export class RequestTooLarge extends Error {}
export async function readRequestBody(req:IncomingMessage&{body?:unknown},limit=16384):Promise<unknown>{
 // Hosting adapters may already have consumed the stream. Never wait on it
 // again when a parsed body is available, and enforce the same size bound.
 if(req.body!==undefined){const text=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(typeof text!=='string')throw new SyntaxError('Invalid JSON body');if(Buffer.byteLength(text)>limit)throw new RequestTooLarge();return typeof req.body==='string'?JSON.parse(req.body):req.body;}
 const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){const part=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=part.length;if(bytes>limit)throw new RequestTooLarge();chunks.push(part);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')||'null');
}
