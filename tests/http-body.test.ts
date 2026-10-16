import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import type {IncomingMessage} from 'node:http';
import {readRequestBody,RequestTooLarge} from '../server/http-body';
test('already-parsed hosting requests never wait for the consumed stream',async()=>{
 const req={body:{controller:'example'},[Symbol.asyncIterator](){throw Error('The adapter already consumed this stream');}} as unknown as IncomingMessage&{body?:unknown};
 assert.deepEqual(await readRequestBody(req),{controller:'example'});
 req.body=JSON.stringify({controller:'text'});assert.deepEqual(await readRequestBody(req),{controller:'text'});
 req.body={oversized:'x'.repeat(17000)};await assert.rejects(readRequestBody(req),RequestTooLarge);
});
test('raw JSON request limits apply to bytes and preserve split UTF-8 characters',async()=>{
 const bytes=Buffer.from(JSON.stringify({name:'Mira Ω'}));const req=Readable.from([bytes.subarray(0,bytes.length-3),bytes.subarray(bytes.length-3)]) as unknown as IncomingMessage;
 assert.deepEqual(await readRequestBody(req),{name:'Mira Ω'});
 await assert.rejects(readRequestBody(Readable.from(['x'.repeat(17000)]) as unknown as IncomingMessage),RequestTooLarge);
});
