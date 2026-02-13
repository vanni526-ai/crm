// 模拟前端的列名映射逻辑
const testData = [
  {
    "老师": "安雅",
    "电话号码": null,
    "活跃状态": "活跃",
    "老师属性": "Switch",
    "受众客户类型": null,
    "城市": "上海",
    "合同到期时间": null,
    "入职时间": null,
    "备注": "k8、k9、sp、耳光、踩踏、xiu辱、视觉剥夺、角色扮演、恋zu等"
  },
  {
    "老师": "烨",
    "电话号码": null,
    "活跃状态": "活跃",
    "老师属性": "S",
    "受众客户类型": null,
    "城市": "上海",
    "合同到期时间": null,
    "入职时间": null,
    "备注": "sp、耳光、k9羞辱、捆绑、角色扮演、足、踩踏、感官剥夺、高跟鞋、制服、物化"
  },
  {
    "老师": "圆圆",
    "电话号码": null,
    "活跃状态": null,
    "老师属性": "S",
    "受众客户类型": null,
    "城市": "上海",
    "合同到期时间": null,
    "入职时间": null,
    "备注": "sp、耳光、k9羞辱、捆绑、角色扮演、足、踩踏、丝足、高跟鞋 "
  }
];

console.log('测试列名映射逻辑\n');
console.log('='.repeat(60));

const allTeachers = [];

testData.forEach((row, idx) => {
  console.log(`\n处理第 ${idx + 1} 行数据:`);
  console.log('原始数据:', JSON.stringify(row, null, 2));
  
  const teacher = {
    name: row['老师'] || row['姓名'] || row['name'] || '',
    phone: row['电话号码'] || row['phone'] ? String(row['电话号码'] || row['phone']) : '',
    status: row['活跃状态'] || row['status'] || '活跃',
    teacherAttribute: row['老师属性'] || row['teacherAttribute'] || undefined,
    customerType: row['受众客户类型'] || row['customerType'] || '',
    notes: row['备注'] || row['notes'] || '',
    category: '其他',
    city: row['城市'] || row['地区'] || '',
  };
  
  console.log('映射后的数据:');
  console.log(`  姓名: ${teacher.name}`);
  console.log(`  电话: ${teacher.phone}`);
  console.log(`  状态: ${teacher.status}`);
  console.log(`  老师属性: ${teacher.teacherAttribute}`);
  console.log(`  城市: ${teacher.city}`);
  console.log(`  备注: ${teacher.notes}`);
  
  if (teacher.name && teacher.name.trim()) {
    allTeachers.push(teacher);
    console.log('  ✅ 数据有效,已添加到导入列表');
  } else {
    console.log('  ❌ 姓名为空,跳过');
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n总结:`);
console.log(`  解析行数: ${testData.length}`);
console.log(`  有效记录: ${allTeachers.length}`);
console.log(`  跳过记录: ${testData.length - allTeachers.length}`);

if (allTeachers.length === testData.length) {
  console.log('\n✅ 测试通过!所有记录都成功映射');
} else {
  console.log('\n⚠️  部分记录被跳过');
}

console.log('\n导入的老师列表:');
allTeachers.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.name} (${t.city}) - 属性: ${t.teacherAttribute || '未设置'}`);
});
