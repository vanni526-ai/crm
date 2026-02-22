import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.query('SELECT * FROM user_role_cities WHERE userId = 15372555');
console.log('=== User Role Cities Data ===');
console.log(JSON.stringify(rows, null, 2));

await connection.end();
