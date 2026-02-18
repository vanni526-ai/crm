import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

/**
 * 订单智能解析路由
 * 为前端App提供订单文本智能解析功能
 */
export const orderParseRouter = router({
  /**
   * 解析订单文本
   * 输入：原始订单文本
   * 输出：解析后的订单字段
   */
  parseOrderText: protectedProcedure
    .input(z.object({
      text: z.string().min(1, "订单文本不能为空"),
    }))
    .mutation(async ({ input }) => {
      const { text } = input;

      try {
        // 获取系统数据用于LLM解析
        const [salespeople, teachers, cities] = await Promise.all([
          db.getAllSalespersons(),
          db.getAllTeachers(),
          db.getAllCities(),
        ]);

        // 构建销售人员和老师名单
        const salespeopleNames = salespeople.map(s => s.name).join("、");
        const teacherNames = teachers.map(t => t.name).join("、");
        const cityNames = cities.map(c => c.name).join("、");

        // 构建LLM提示词
        const prompt = `你是一个专业的订单信息提取助手。请从以下订单文本中提取订单信息。

**系统数据参考**（用于提高识别准确率）：
- 销售人员名单：${salespeopleNames}
- 老师名单：${teacherNames}
- 城市名单：${cityNames}

**订单文本**：
${text}

**提取规则**：

1. **销售人员** - 订单信息第一个词，销售人员的花名（如"昭昭"、"嘟嘟"、"山竹"）
   - 必须从销售人员名单中匹配，如果找不到则留空

2. **客户名** - 客户的名字
   - **位置规则**：客户名通常在老师名之后、金额信息之前
   - **排除规则**：客户名**不能**是：
     * 老师名（必须从老师名单中排除）
     * 销售人员名（必须从销售人员名单中排除）
     * 课程名（如"基础局"、"埃及艳后"等）
     * 城市名（必须从城市名单中排除）
   - 如果无法确定客户名，则留空

3. **上课日期** - 格式YYYY-MM-DD（如"2025-12-17"）
   - 如果只有月日（如"1.24"），则补充当前年份

4. **上课时间** - 时间范围（如"20:30-21:30"、"18:00-20:00"）

5. **课程名称** - 课程内容（如"sp课"、"裸足丝袜+埃及艳后"）

6. **老师名称** - 老师的名字（如"云云"、"皮皮"）
   - 必须从老师名单中匹配，如果找不到则留空

7. **城市** - 上课城市
   - 必须从城市名单中匹配
   - 教室到城市的映射规则：
     * "404教室" 或 "404" → "上海"
     * "1101教室" 或 "1101" → "上海"
     * "捕运大厦16D" → "上海"
     * "腾讯会议" → "互联网课"

8. **教室** - 教室信息（如"无锡教室"、"济南教室"）

9. **支付金额** - 总支付金额（定金+尾款）

10. **课程金额** - 课程总价

11. **首付金额** - 定金金额

12. **尾款金额** - 尾款金额

13. **老师费用** - 老师的费用
    - 常见表达："给老师XXX"、"给XXX(老师名)XXX"
    - **特别规则**：如果课程名称包含"理论课"关键词，且没有明确标注老师费用，则默认为0
    - 如果没有明确提到，则填0

14. **车费** - 报销的车费/交通费
    - 常见表达："报销老师XXX车费"、"老师打车XXX"
    - 如果没有明确提到，则填0

15. **账户余额** - 从文本中提取余额信息
    - 如"余额 6200抵扣 2400剩 3800"提取3800
    - 如"余额 9200-3600=5600"提取5600
    - 如果没有提及余额则填0

16. **支付方式** - 支付渠道（如"支付宝"、"微信"、"富掌柜"、"现金"）
    - 如果没有明确提及则留空

17. **渠道订单号** - 交易单号/渠道订单号
    - 常见表达："交易单号XXXXXXXX"、"交易编号XXXXXXXX"
    - 支付宝订单号格式：A开头+数字，共25-28位
    - 微信支付订单号格式：纯数字，共28-32位
    - **重要**：如果没有明确提到，则必须留空，不要填充占位符

18. **作废订单识别** - 如果客户名以"作废"开头（如"作废-abc"、"作废 abc"）
    - 在customerName字段中保留完整的"作废-xxx"格式
    - 必须提取渠道订单号并填入channelOrderNo字段

19. **备注** - 保存完整的原始文本信息

**输出格式**：
请以JSON格式返回提取的订单信息，字段名使用英文：
{
  "salesperson": "销售人员名",
  "customerName": "客户名",
  "classDate": "YYYY-MM-DD",
  "classTime": "HH:MM-HH:MM",
  "course": "课程名称",
  "teacher": "老师名",
  "city": "城市名",
  "classroom": "教室",
  "paymentAmount": 数字,
  "courseAmount": 数字,
  "downPayment": 数字,
  "finalPayment": 数字,
  "teacherFee": 数字,
  "carFee": 数字,
  "accountBalance": 数字,
  "paymentMethod": "支付方式",
  "channelOrderNo": "渠道订单号",
  "notes": "原始文本"
}`;

        // 调用LLM解析
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一个专业的订单信息提取助手。请严格按照JSON格式返回提取的订单信息。" },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "order_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  salesperson: { type: "string", description: "销售人员名" },
                  customerName: { type: "string", description: "客户名" },
                  classDate: { type: "string", description: "上课日期 YYYY-MM-DD" },
                  classTime: { type: "string", description: "上课时间 HH:MM-HH:MM" },
                  course: { type: "string", description: "课程名称" },
                  teacher: { type: "string", description: "老师名" },
                  city: { type: "string", description: "城市名" },
                  classroom: { type: "string", description: "教室" },
                  paymentAmount: { type: "number", description: "支付金额" },
                  courseAmount: { type: "number", description: "课程金额" },
                  downPayment: { type: "number", description: "首付金额" },
                  finalPayment: { type: "number", description: "尾款金额" },
                  teacherFee: { type: "number", description: "老师费用" },
                  carFee: { type: "number", description: "车费" },
                  accountBalance: { type: "number", description: "账户余额" },
                  paymentMethod: { type: "string", description: "支付方式" },
                  channelOrderNo: { type: "string", description: "渠道订单号" },
                  notes: { type: "string", description: "备注" }
                },
                required: [
                  "salesperson", "customerName", "classDate", "classTime",
                  "course", "teacher", "city", "classroom",
                  "paymentAmount", "courseAmount", "downPayment", "finalPayment",
                  "teacherFee", "carFee", "accountBalance",
                  "paymentMethod", "channelOrderNo", "notes"
                ],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "LLM解析失败：未返回内容"
          });
        }

        const parsedOrder = JSON.parse(content);

        // 后处理：自动识别支付渠道
        if (parsedOrder.channelOrderNo && !parsedOrder.paymentMethod) {
          const orderNoLength = parsedOrder.channelOrderNo.length;
          if (parsedOrder.channelOrderNo.startsWith('A') && orderNoLength >= 25 && orderNoLength <= 28) {
            parsedOrder.paymentMethod = "支付宝";
          } else if (orderNoLength >= 28 && orderNoLength <= 32) {
            parsedOrder.paymentMethod = "微信";
          }
        }

        // 后处理：计算合伙人费用
        if (parsedOrder.city && parsedOrder.teacherFee) {
          const cityConfig = cities.find(c => c.name === parsedOrder.city);
          if (cityConfig && cityConfig.partnerFeeRate) {
            parsedOrder.partnerFee = Math.round(parsedOrder.teacherFee * cityConfig.partnerFeeRate);
          }
        }

        // 后处理：检查是否为作废订单
        const isVoidOrder = parsedOrder.customerName && parsedOrder.customerName.startsWith("作废");

        return {
          success: true,
          order: parsedOrder,
          isVoidOrder,
          warnings: []
        };

      } catch (error: any) {
        console.error("订单解析失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `订单解析失败: ${error.message}`
        });
      }
    }),
});
