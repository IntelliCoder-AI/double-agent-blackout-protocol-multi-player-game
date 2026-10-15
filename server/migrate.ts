import { Store } from './store.js';
const url=process.env.DATABASE_URL;
if(!url)throw Error('DATABASE_URL is required for an explicit migration.');
const store=new Store(url);
try{await store.migrate();await store.check();console.log('DOUBLE AGENT schema is ready.');}finally{await store.close();}
