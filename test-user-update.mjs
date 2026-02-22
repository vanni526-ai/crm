import { createCaller } from './server/_core/trpc.js';
import { appRouter } from './server/routers.js';

const testUserId = 16800186; // Test user ID

// Create a mock context with admin user
const mockContext = {
  user: {
    id: 1,
    openId: 'test_admin',
    name: 'Test Admin',
    role: 'admin',
    roles: 'admin',
  },
};

const caller = createCaller(mockContext)(appRouter);

try {
  console.log('\n=== 测试用户管理更新接口 ===\n');
  
  // Test update user
  console.log(`测试更新用户 ID: ${testUserId}`);
  const updateResult = await caller.userManagement.update({
    id: testUserId,
    nickname: 'Updated Nickname ' + Date.now(),
  });
  
  console.log('✅ 更新成功:', updateResult);
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error('错误详情:', error);
  process.exit(1);
}
