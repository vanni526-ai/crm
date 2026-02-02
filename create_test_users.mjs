import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

async function createTestUsers() {
  console.log('开始创建测试账号...\n');

  // 管理员账号
  const adminPassword = await bcrypt.hash('admin123', 10);
  const [existingAdmin] = await db.select().from(users).where(eq(users.name, 'test_admin'));
  
  if (existingAdmin) {
    await db.update(users)
      .set({
        password: adminPassword,
        phone: '13800138001',
        nickname: '测试管理员',
        email: 'admin@test.com',
        role: 'admin',
        isActive: true
      })
      .where(eq(users.name, 'test_admin'));
    console.log('✅ 管理员账号已更新');
  } else {
    await db.insert(users).values({
      name: 'test_admin',
      password: adminPassword,
      phone: '13800138001',
      nickname: '测试管理员',
      email: 'admin@test.com',
      role: 'admin',
      isActive: true,
      openId: 'test_admin_' + Date.now()
    });
    console.log('✅ 管理员账号已创建');
  }

  // 普通用户账号
  const userPassword = await bcrypt.hash('user123', 10);
  const [existingUser] = await db.select().from(users).where(eq(users.name, 'test_user'));
  
  if (existingUser) {
    await db.update(users)
      .set({
        password: userPassword,
        phone: '13900139001',
        nickname: '测试用户',
        email: 'user@test.com',
        role: 'user',
        isActive: true
      })
      .where(eq(users.name, 'test_user'));
    console.log('✅ 普通用户账号已更新');
  } else {
    await db.insert(users).values({
      name: 'test_user',
      password: userPassword,
      phone: '13900139001',
      nickname: '测试用户',
      email: 'user@test.com',
      role: 'user',
      isActive: true,
      openId: 'test_user_' + Date.now()
    });
    console.log('✅ 普通用户账号已创建');
  }

  console.log('\n📋 测试账号信息:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('【管理员账号】');
  console.log('  用户名: test_admin');
  console.log('  密码: admin123');
  console.log('  手机号: 13800138001');
  console.log('  角色: 管理员 (admin)');
  console.log('  权限: 所有系统权限');
  console.log('');
  console.log('【普通用户账号】');
  console.log('  用户名: test_user');
  console.log('  密码: user123');
  console.log('  手机号: 13900139001');
  console.log('  角色: 普通用户 (user)');
  console.log('  权限: 基本访问权限');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await connection.end();
}

createTestUsers().catch(console.error);
