import { standardizeClassroom } from "./server/classroomMappingRules";

function testClassroomRules() {
  const testCases = [
    { input: "天津教室", city: "天津" },
    { input: "天津1501", city: "天津" },
    { input: "(天津)", city: "天津" },
    { input: "天津场", city: "天津" },
    { input: "天津上", city: "天津" },
    { input: "天津", city: "天津" },
    { input: "ゴミ箱", city: "天津" },
  ];

  console.log("测试教室名称标准化规则:\n");

  for (const testCase of testCases) {
    const result = standardizeClassroom(testCase.input, testCase.city);
    console.log(`输入: "${testCase.input}" (城市: ${testCase.city})`);
    if (result) {
      console.log(`  ✅ 标准化为: ${result.city} - ${result.classroom}`);
    } else {
      console.log(`  ❌ 无匹配规则`);
    }
    console.log("");
  }
}

testClassroomRules();
