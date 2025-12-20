/**
 * 备注智能提取模块
 * 从订单备注中自动识别和提取结构化信息
 */

export interface ExtractedNotesInfo {
  tags: string[];  // 标签数组
  discountInfo: DiscountInfo | null;  // 折扣信息
  couponInfo: CouponInfo | null;  // 优惠券信息
  membershipInfo: MembershipInfo | null;  // 会员信息
  paymentStatus: string;  // 支付状态
  specialNotes: string;  // 特殊备注
}

export interface DiscountInfo {
  type: string;  // 折扣类型(活动折扣、会员折扣等)
  rate?: number;  // 折扣率(0-1)
  description: string;  // 描述
}

export interface CouponInfo {
  source: string;  // 来源(抖音、美团、市场部等)
  amount: number;  // 优惠金额
  description: string;  // 描述
}

export interface MembershipInfo {
  type: string;  // 会员类型(充值会员、普通会员等)
  balance?: number;  // 余额
  deduction?: number;  // 本次扣款
  description: string;  // 描述
}

/**
 * 从备注中提取结构化信息
 */
export function extractNotesInfo(notes: string): ExtractedNotesInfo {
  if (!notes || notes.trim() === "") {
    return {
      tags: [],
      discountInfo: null,
      couponInfo: null,
      membershipInfo: null,
      paymentStatus: "",
      specialNotes: ""
    };
  }

  const tags: string[] = [];
  let discountInfo: DiscountInfo | null = null;
  let couponInfo: CouponInfo | null = null;
  let membershipInfo: MembershipInfo | null = null;
  let paymentStatus = "";
  let specialNotes = "";

  const notesLower = notes.toLowerCase();

  // 1. 优惠活动识别
  discountInfo = extractDiscountInfo(notes, notesLower, tags);

  // 2. 优惠券识别
  couponInfo = extractCouponInfo(notes, notesLower, tags);

  // 3. 会员/充值识别
  membershipInfo = extractMembershipInfo(notes, notesLower, tags);

  // 4. 复购识别
  extractRepurchaseInfo(notes, notesLower, tags);

  // 5. 支付状态识别
  paymentStatus = extractPaymentStatus(notes, notesLower, tags);

  // 6. 特殊要求识别
  specialNotes = extractSpecialNotes(notes, notesLower);

  // 7. 巡游/外地识别
  extractTourInfo(notes, notesLower, tags);

  return {
    tags,
    discountInfo,
    couponInfo,
    membershipInfo,
    paymentStatus,
    specialNotes
  };
}

/**
 * 提取折扣信息
 */
function extractDiscountInfo(notes: string, notesLower: string, tags: string[]): DiscountInfo | null {
  let discountInfo: DiscountInfo | null = null;

  // 半价活动
  if (notesLower.includes("半价")) {
    const match = notes.match(/(第[一二三四五六七八九十\d]+节?|第[一二三四五六七八九十\d]+个?小时?)半价/);
    if (match) {
      const desc = `${match[1]}半价`;
      tags.push(`优惠活动:${desc}`);
      discountInfo = {
        type: "活动折扣",
        rate: 0.5,
        description: desc
      };
    } else {
      tags.push("优惠活动:半价");
      discountInfo = {
        type: "活动折扣",
        rate: 0.5,
        description: "半价"
      };
    }
  }

  // 送课活动(九送二、六送一等)
  const giftMatch = notes.match(/([一二三四五六七八九十\d]+)送([一二三四五六七八九十\d]+)/);
  if (giftMatch) {
    const desc = `${giftMatch[1]}送${giftMatch[2]}`;
    tags.push(`优惠活动:${desc}`);
    if (!discountInfo) {
      discountInfo = {
        type: "赠送活动",
        description: desc
      };
    }
  }

  // 折扣(8折、9折等)
  const discountMatch = notes.match(/([0-9.]+)折/);
  if (discountMatch) {
    const rate = parseFloat(discountMatch[1]) / 10;
    const desc = `${discountMatch[1]}折`;
    tags.push(`优惠活动:${desc}`);
    if (!discountInfo) {
      discountInfo = {
        type: "折扣优惠",
        rate,
        description: desc
      };
    }
  }

  // 特定活动名称
  const activityPatterns = [
    /疯狂周三/,
    /12\.12活动/,
    /双十一/,
    /双十二/,
    /周年庆/
  ];
  
  for (const pattern of activityPatterns) {
    const match = notes.match(pattern);
    if (match) {
      tags.push(`优惠活动:${match[0]}`);
      if (!discountInfo) {
        discountInfo = {
          type: "活动折扣",
          description: match[0]
        };
      }
      break;
    }
  }

  return discountInfo;
}

/**
 * 提取优惠券信息
 */
function extractCouponInfo(notes: string, notesLower: string, tags: string[]): CouponInfo | null {
  let couponInfo: CouponInfo | null = null;

  // 抖音来客优惠券
  const douyinMatch = notes.match(/抖音来客\s*(\d+)/);
  if (douyinMatch) {
    const amount = parseInt(douyinMatch[1]);
    tags.push(`优惠券:抖音来客${amount}`);
    couponInfo = {
      source: "抖音",
      amount,
      description: `抖音来客${amount}`
    };
    
    if (notesLower.includes("核销") || notesLower.includes("已核销")) {
      tags.push("优惠券:已核销");
    }
  }

  // 满减券(满1000-100)
  const manjianMatch = notes.match(/满\s*(\d+)\s*[-—]\s*(\d+)/);
  if (manjianMatch) {
    const threshold = parseInt(manjianMatch[1]);
    const amount = parseInt(manjianMatch[2]);
    tags.push(`优惠券:满${threshold}减${amount}`);
    
    if (!couponInfo) {
      couponInfo = {
        source: "满减券",
        amount,
        description: `满${threshold}减${amount}`
      };
    }
  }

  // 抵扣券
  const dikouMatch = notes.match(/抵扣\s*(\d+)/);
  if (dikouMatch && !couponInfo) {
    const amount = parseInt(dikouMatch[1]);
    tags.push(`优惠券:抵扣${amount}`);
    couponInfo = {
      source: "抵扣券",
      amount,
      description: `抵扣${amount}元`
    };
  }

  // 市场部优惠券
  if (notesLower.includes("市场部") && notesLower.includes("券")) {
    tags.push("优惠券:市场部");
    const discountMatch = notes.match(/([0-9.]+)折/);
    if (discountMatch && !couponInfo) {
      const rate = parseFloat(discountMatch[1]) / 10;
      const amount = 0; // 无法直接计算金额
      couponInfo = {
        source: "市场部",
        amount,
        description: `市场部${discountMatch[1]}折优惠券`
      };
    }
  }

  return couponInfo;
}

/**
 * 提取会员信息
 */
function extractMembershipInfo(notes: string, notesLower: string, tags: string[]): MembershipInfo | null {
  let membershipInfo: MembershipInfo | null = null;

  // 充值客户
  if (notesLower.includes("充值客户") || notesLower.includes("充值会员")) {
    tags.push("会员:充值客户");
    membershipInfo = {
      type: "充值会员",
      description: "充值客户"
    };
  }

  // 会员
  if (notesLower.includes("会员") && !membershipInfo) {
    tags.push("会员");
    membershipInfo = {
      type: "普通会员",
      description: "会员"
    };
  }

  // 余额计算(余额8400-1500-1200=5700)
  const balanceMatch = notes.match(/余额\s*(\d+(?:\.\d+)?)\s*([-+\d.=\s]+)/);
  if (balanceMatch) {
    try {
      // 解析余额表达式
      const initialBalance = parseFloat(balanceMatch[1]);
      const expression = balanceMatch[2].replace(/\s/g, '');
      
      // 计算最终余额
      let finalBalance = initialBalance;
      let totalDeduction = 0;
      
      const operations = expression.match(/[-+]\d+(?:\.\d+)?/g);
      if (operations) {
        operations.forEach(op => {
          const value = parseFloat(op);
          finalBalance += value;
          if (value < 0) {
            totalDeduction += Math.abs(value);
          }
        });
      }
      
      // 检查是否有等号后的最终余额
      const equalMatch = expression.match(/=(\d+(?:\.\d+)?)/);
      if (equalMatch) {
        finalBalance = parseFloat(equalMatch[1]);
      }
      
      tags.push(`余额:${finalBalance}`);
      
      if (membershipInfo) {
        membershipInfo.balance = finalBalance;
        membershipInfo.deduction = totalDeduction;
        membershipInfo.description += ` 余额${finalBalance}`;
      } else {
        membershipInfo = {
          type: "充值会员",
          balance: finalBalance,
          deduction: totalDeduction,
          description: `余额${finalBalance}`
        };
      }
    } catch (e) {
      // 解析失败,忽略
    }
  }

  return membershipInfo;
}

/**
 * 提取复购信息
 */
function extractRepurchaseInfo(notes: string, notesLower: string, tags: string[]): void {
  // 第X次复购
  const repurchaseMatch = notes.match(/第([一二三四五六七八九十\d]+)次复购/);
  if (repurchaseMatch) {
    const count = repurchaseMatch[1];
    tags.push(`复购:第${count}次`);
  } else if (notesLower.includes("复购")) {
    tags.push("复购");
  }

  // 剩余课时
  const remainingMatch = notes.match(/(?:还剩|剩余)\s*(\d+(?:\.\d+)?)\s*节/);
  if (remainingMatch) {
    const remaining = remainingMatch[1];
    tags.push(`剩余课时:${remaining}节`);
  }
}

/**
 * 提取支付状态
 */
function extractPaymentStatus(notes: string, notesLower: string, tags: string[]): string {
  let status = "";

  // 全款已付
  if (notesLower.includes("全款已付") || notesLower.includes("全款")) {
    status = "全款已付";
    tags.push("支付:全款已付");
  }
  // 定金已付
  else if (notesLower.includes("定金已付") || notesLower.includes("定金")) {
    status = "定金已付";
    
    const depositMatch = notes.match(/定金\s*(\d+)/);
    if (depositMatch) {
      tags.push(`定金:${depositMatch[1]}`);
    } else {
      tags.push("支付:定金已付");
    }
    
    // 检查尾款状态
    const balanceMatch = notes.match(/尾款\s*(\d+)/);
    if (balanceMatch) {
      if (notesLower.includes("尾款未付") || notesLower.includes("未付")) {
        tags.push(`尾款未付:${balanceMatch[1]}`);
        status = "部分未付";
      } else if (notesLower.includes("尾款已付")) {
        tags.push(`尾款已付:${balanceMatch[1]}`);
        status = "全款已付";
      }
    }
  }
  // 未付
  else if (notesLower.includes("未付")) {
    const unpaidMatch = notes.match(/(\d+)\s*未付/);
    if (unpaidMatch) {
      status = "部分未付";
      tags.push(`未付:${unpaidMatch[1]}`);
    } else {
      status = "待付款";
      tags.push("支付:待付款");
    }
  }

  return status;
}

/**
 * 提取特殊备注
 */
function extractSpecialNotes(notes: string, notesLower: string): string {
  const specialKeywords = [
    "时间改变",
    "临时换老师",
    "换老师",
    "改时间",
    "特殊要求",
    "注意",
    "重要"
  ];

  const specialParts: string[] = [];
  
  for (const keyword of specialKeywords) {
    if (notesLower.includes(keyword.toLowerCase())) {
      // 提取包含关键词的句子
      const sentences = notes.split(/[。,，;；\n]/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
          specialParts.push(sentence.trim());
        }
      }
    }
  }

  return specialParts.join("; ");
}

/**
 * 提取巡游/外地信息
 */
function extractTourInfo(notes: string, notesLower: string, tags: string[]): void {
  // 巡游
  if (notesLower.includes("巡游")) {
    const percentMatch = notes.match(/巡游\s*(\d+)%/);
    if (percentMatch) {
      tags.push(`巡游:${percentMatch[1]}%`);
    } else {
      tags.push("巡游");
    }
  }

  // 外地城市(城市名+上)
  const cities = ["北京", "上海", "天津", "成都", "重庆", "武汉", "郑州", "济南", "南京", "苏州", "无锡", "东莞", "福州", "泉州", "太原", "石家庄"];
  for (const city of cities) {
    if (notes.includes(`${city}上`)) {
      tags.push(`外地:${city}`);
      break;
    }
  }
}
