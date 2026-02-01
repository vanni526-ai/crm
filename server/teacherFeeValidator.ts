/**
 * 老师费用验证工具
 * 确保老师费用不超过课程金额
 */

export interface TeacherFeeValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * 验证老师费用是否合理
 * @param teacherFee 老师费用
 * @param courseAmount 课程金额
 * @returns 验证结果
 */
export function validateTeacherFee(
  teacherFee: number | null | undefined,
  courseAmount: number | null | undefined
): TeacherFeeValidationResult {
  // 如果老师费用为空或0,认为是合理的(可能是免费课程或未填写)
  if (!teacherFee || teacherFee === 0) {
    return { isValid: true };
  }

  // 允许课程金额为0时设置老师费用(例如:线下活动、内部培训等场景)
  // 如果课程金额为0但老师费用不为0,给出警告但仍然允许
  if ((!courseAmount || courseAmount === 0) && teacherFee > 0) {
    return {
      isValid: true,
      warning: "课程金额为0但设置了老师费用,请确认是否为线下活动或内部培训"
    };
  }

  // 老师费用不能为负数
  if (teacherFee < 0) {
    return {
      isValid: false,
      error: "老师费用不能为负数"
    };
  }

  // 课程金额不能为负数
  if (courseAmount !== null && courseAmount !== undefined && courseAmount < 0) {
    return {
      isValid: false,
      error: "课程金额不能为负数"
    };
  }

  // 核心规则:老师费用不能超过课程金额(只在课程金额>0时检查)
  if (courseAmount && courseAmount > 0 && teacherFee > courseAmount) {
    return {
      isValid: false,
      error: `老师费用(￥${teacherFee.toFixed(2)})不能超过课程金额(￥${courseAmount.toFixed(2)})`
    };
  }

  // 警告:老师费用超过课程金额的80%可能不合理(只在课程金额>0时检查)
  if (courseAmount && courseAmount > 0 && teacherFee > courseAmount * 0.8) {
    return {
      isValid: true,
      warning: `老师费用(￥${teacherFee.toFixed(2)})占课程金额(￥${courseAmount.toFixed(2)})的${((teacherFee / courseAmount) * 100).toFixed(0)}%,比例较高,请确认是否正确`
    };
  }

  return { isValid: true };
}

/**
 * 批量验证订单的老师费用
 * @param orders 订单列表
 * @returns 验证结果列表
 */
export function batchValidateTeacherFees(
  orders: Array<{
    id: number;
    orderNo: string;
    teacherFee: number | null;
    courseAmount: number | null;
  }>
): Array<{
  orderId: number;
  orderNo: string;
  validation: TeacherFeeValidationResult;
}> {
  return orders.map(order => ({
    orderId: order.id,
    orderNo: order.orderNo,
    validation: validateTeacherFee(order.teacherFee, order.courseAmount)
  }));
}
