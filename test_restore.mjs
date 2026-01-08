import { restoreOrderFeesFromGmail } from './server/restoreOrderFees.ts';

async function main() {
  console.log('开始测试数据恢复...');
  try {
    const result = await restoreOrderFeesFromGmail();
    console.log('恢复结果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('恢复失败:', error);
    process.exit(1);
  }
}

main();
