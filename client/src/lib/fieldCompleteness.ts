/**
 * 字段完整度评分逻辑
 */

export interface FieldCompletenessResult {
  score: number; // 完整度分数 0-100
  missingFields: Array<{
    field: string;
    label: string;
    importance: "high" | "medium" | "low";
  }>;
  level: "excellent" | "good" | "fair" | "poor";
}

/**
 * 评估订单字段完整度
 */
export function evaluateFieldCompleteness(order: any): FieldCompletenessResult {
  const missingFields: FieldCompletenessResult["missingFields"] = [];

  // 定义重要字段及其权重
  const fieldConfig = [
    // 高优先级字段(必填或非常重要)
    { field: "customerName", label: "客户名", importance: "high" as const, weight: 15 },
    { field: "deliveryTeacher", label: "老师", importance: "high" as const, weight: 15 },
    { field: "deliveryCourse", label: "课程", importance: "high" as const, weight: 10 },
    { field: "classDate", label: "上课日期", importance: "high" as const, weight: 10 },
    { field: "classTime", label: "上课时间", importance: "high" as const, weight: 10 },
    
    // 中优先级字段(重要但可选)
    { field: "channelOrderNo", label: "渠道订单号", importance: "medium" as const, weight: 8 },
    { field: "teacherFee", label: "老师费用", importance: "medium" as const, weight: 8 },
    { field: "transportFee", label: "车费", importance: "medium" as const, weight: 7 },
    { field: "deliveryCity", label: "城市", importance: "medium" as const, weight: 5 },
    { field: "deliveryRoom", label: "教室", importance: "medium" as const, weight: 5 },
    
    // 低优先级字段(可选)
    { field: "paymentMethod", label: "支付方式", importance: "low" as const, weight: 3 },
    { field: "notes", label: "备注", importance: "low" as const, weight: 2 },
  ];

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const config of fieldConfig) {
    totalWeight += config.weight;
    
    const value = order[config.field];
    const isEmpty = !value || value === "" || value === "0" || value === 0;
    
    if (isEmpty) {
      missingFields.push({
        field: config.field,
        label: config.label,
        importance: config.importance,
      });
    } else {
      achievedWeight += config.weight;
    }
  }

  const score = Math.round((achievedWeight / totalWeight) * 100);

  let level: FieldCompletenessResult["level"];
  if (score >= 90) {
    level = "excellent";
  } else if (score >= 75) {
    level = "good";
  } else if (score >= 60) {
    level = "fair";
  } else {
    level = "poor";
  }

  return {
    score,
    missingFields,
    level,
  };
}

/**
 * 获取完整度等级的颜色
 */
export function getCompletenessColor(level: FieldCompletenessResult["level"]): string {
  switch (level) {
    case "excellent":
      return "text-green-600 dark:text-green-400";
    case "good":
      return "text-blue-600 dark:text-blue-400";
    case "fair":
      return "text-yellow-600 dark:text-yellow-400";
    case "poor":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * 获取完整度等级的背景色
 */
export function getCompletenessBgColor(level: FieldCompletenessResult["level"]): string {
  switch (level) {
    case "excellent":
      return "bg-green-100 dark:bg-green-900";
    case "good":
      return "bg-blue-100 dark:bg-blue-900";
    case "fair":
      return "bg-yellow-100 dark:bg-yellow-900";
    case "poor":
      return "bg-red-100 dark:bg-red-900";
  }
}

/**
 * 获取完整度等级的文本
 */
export function getCompletenessLabel(level: FieldCompletenessResult["level"]): string {
  switch (level) {
    case "excellent":
      return "优秀";
    case "good":
      return "良好";
    case "fair":
      return "一般";
    case "poor":
      return "较差";
  }
}

/**
 * 获取重要性标签颜色
 */
export function getImportanceColor(importance: "high" | "medium" | "low"): string {
  switch (importance) {
    case "high":
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "low":
      return "text-gray-600 dark:text-gray-400";
  }
}
