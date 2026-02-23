import { SignJWT } from 'jose';

const JWT_SECRET = 'NLfhjW8BxHuaEbw9k6rNWG';
const TEST_USER_ID = 11040019;

const secretKey = new TextEncoder().encode(JWT_SECRET);

const token = await new SignJWT({
  id: TEST_USER_ID,
  openId: 'YM5cCxDHqzhWt3WnFYKDYB',
  name: 'yi han',
})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setExpirationTime('24h')
  .sign(secretKey);

console.log(token);
