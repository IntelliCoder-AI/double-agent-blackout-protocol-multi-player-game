import pg from 'pg';
import { hostedSchema } from './hosted';
if(!process.env.DATABASE_URL?.startsWith('postgres'))throw Error('Set a server-only PostgreSQL DATABASE_URL.');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{await pool.query(hostedSchema);console.log('Hosted game schema ready.');}finally{await pool.end();}
