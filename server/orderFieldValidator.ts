/**
 * 订单字段合理性验证工具
 * 用于检测订单字段中的异常值
 */

export interface ValidationWarning {
  field: string;
  value: any;
  message: string;
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
}

/**
 * 验证订单字段的合理性
 * @param order 订单数据
 * @returns 验证结果
 */
export function validateOrderFields(order: {
  transportFee?: string | number;
  teacherFee?: string | number;
  paymentAmount?: string | number;
  courseAmount?: string | number;
  otherFee?: string | number;
  partnerFee?: string | number;
}): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // 转换为数字
  const transportFee = parseFloat(String(order.transportFee || 0));
  const teacherFee = parseFloat(String(order.teacherFee || 0));
  const paymentAmount = parseFloat(String(order.paymentAmount || 0));
  const courseAmount = parseFloat(String(order.courseAmount || 0));
  const otherFee = parseFloat(String(order.otherFee || 0));
  const partnerFee = parseFloat(String(order.partnerFee || 0));

  // 验证车费(通常不超过200元)
  if (transportFee > 200) {
    warnings.push({
      field: 'transportFee',
      value: transportFee,
      message: `车费 ¥${transportFee} 超过常规范围(通常不超过¥200),请检查是否正确`,
      severity: 'warning',
    });
  }

  // 验证老师费用(通常在100-2000元之间)
  if (teacherFee > 0 && teacherFee < 50) {
    warnings.push({
      field: 'teacherFee',
      value: teacherFee,
      message: `老师费用 ¥${teacherFee} 偏低(通常不低于¥50),请检查是否正确`,
      severity: 'warning',
    });
  }

  if (teacherFee > 3000) {
    warnings.push({
      field: 'teacherFee',
      value: teacherFee,
      message: `老师费用 ¥${teacherFee} 偏高(通常不超过¥3000),请检查是否正确`,
      severity: 'warning',
    });
  }

  // 验证支付金额和课程金额的关系
  if (paymentAmount > 0 && courseAmount > 0 && paymentAmount > courseAmount * 1.5) {
    warnings.push({
      field: 'paymentAmount',
      value: paymentAmount,
      message: `支付金额 ¥${paymentAmount} 远大于课程金额 ¥${courseAmount},请检查是否正确`,
      severity: 'warning',
    });
  }

  // 验证其他费用(通常不超过1000元)
  if (otherFee > 1000) {
    warnings.push({
      field: 'otherFee',
      value: otherFee,
      message: `其他费用 ¥${otherFee} 超过常规范围(通常不超过¥1000),请检查是否正确`,
      severity: 'warning',
    });
  }

  // 验证合伙人费用(通常不超过课程金额的50%)
  if (partnerFee > 0 && courseAmount > 0 && partnerFee > courseAmount * 0.5) {
    warnings.push({
      field: 'partnerFee',
      value: partnerFee,
      message: `合伙人费用 ¥${partnerFee} 超过课程金额的50%,请检查是否正确`,
      severity: 'warning',
    });
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * 获取字段的中文名称
 * @param field 字段名
 * @returns 中文名称
 */
export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    transportFee: '车费',
    teacherFee: '老师费用',
    paymentAmount: '支付金额',
    courseAmount: '课程金额',
    otherFee: '其他费用',
    partnerFee: '合伙人费用',
  };
  return labels[field] || field;
}
