/**
 * 场地合同工具函数
 */

/**
 * 计算下次房租支付日期
 * @param leaseStartDate 起租日期
 * @param paymentCycle 付款方式
 * @returns 下次支付日期
 */
export function calculateNextPaymentDate(
  leaseStartDate: Date,
  paymentCycle: "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual"
): Date {
  const nextDate = new Date(leaseStartDate);
  
  switch (paymentCycle) {
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "bimonthly":
      nextDate.setMonth(nextDate.getMonth() + 2);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "semiannual":
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case "annual":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
}

/**
 * 计算距离下次支付日期的天数
 * @param nextPaymentDate 下次支付日期
 * @returns 距离下次支付的天数
 */
export function calculateDaysUntilNextPayment(nextPaymentDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextPaymentDate.setHours(0, 0, 0, 0);
  
  const diffTime = nextPaymentDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 获取付款方式的中文名称
 * @param paymentCycle 付款方式
 * @returns 中文名称
 */
export function getPaymentCycleName(
  paymentCycle: "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual"
): string {
  const names = {
    monthly: "月付",
    bimonthly: "两月付",
    quarterly: "季付",
    semiannual: "半年付",
    annual: "年付",
  };
  
  return names[paymentCycle];
}
