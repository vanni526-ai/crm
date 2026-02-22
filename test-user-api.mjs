// Simple HTTP test for user management API
const testUserId = 16800186;

console.log('\n=== 测试用户管理API ===\n');
console.log('请在浏览器控制台中运行以下代码测试：\n');
console.log(`
// 测试更新用户
const testUpdate = async () => {
  try {
    const result = await window.trpc.userManagement.update.mutate({
      id: ${testUserId},
      nickname: 'Test Update ' + Date.now()
    });
    console.log('✅ 更新成功:', result);
  } catch (error) {
    console.error('❌ 更新失败:', error);
  }
};

testUpdate();
`);

console.log('\n或者直接访问用户管理页面，点击编辑按钮测试');
console.log('查看后端日志输出：');
console.log('  [UserManagement] 更新请求: userId= ...');
console.log('  [UserManagement] 更新成功: userId= ...');
