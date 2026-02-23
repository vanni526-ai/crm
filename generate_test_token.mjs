/**
 * 生成测试用的Bearer Token
 */

import { SignJWT } from 'jose';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('错误：未找到JWT_SECRET环境变量');
  process.exit(1);
}

// 测试用户ID（使用当前登录的admin用户）
const TEST_USER_ID = 11040019; // yi han (admin)

async function generateToken() {
  const secretKey = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new SignJWT({
    id: TEST_USER_ID,
    openId: 'YM5cCxDHqzhWt3WnFYKDYB',
    name: 'yi han',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime('24h')
    .sign(secretKey);

  console.log('生成的Bearer Token:');
  console.log(token);
  console.log('\n使用方法:');
  console.log(`node ../test_bearer_token.js "${token}"`);
  
  return token;
}

generateToken().catch(console.error);
