import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Querying User Membership Data ===\n');

// Query user data
const [userRows] = await connection.query(`
  SELECT 
    id, openId, name, nickname, roles, 
    membershipStatus, isMember, membershipOrderId, 
    membershipActivatedAt, membershipExpiresAt, 
    createdAt, updatedAt 
  FROM users 
  WHERE id = 16800186
`);

console.log('User Data:');
console.log(JSON.stringify(userRows, null, 2));

// Query membership order
const [orderRows] = await connection.query(`
  SELECT 
    id, channelOrderNo, customerName, courseName, coursePrice, 
    classDate, status, createdAt, updatedAt 
  FROM orders 
  WHERE id = 2610002
`);

console.log('\n=== Membership Order Data ===');
console.log(JSON.stringify(orderRows, null, 2));

await connection.end();
