import { describe, it, expect } from 'vitest';
import { parseTransferNotes } from './transferNoteParser';

describe('车费识别测试', () => {
  it('应该正确识别"报销老师100车费"中的车费', { timeout: 30000 }, async () => {
    const text = `山竹 12.20 21:30-23:30 基础局+线下乳首课 唐泽上 JoeGong 1200定金已付 1600尾款未付(上海404)报销老师100车费 给老师600 支付宝收款`;
    
    const result = await parseTransferNotes(text);
    
    expect(result.length).toBe(1);
    expect(result[0].teacherFee).toBe('600'); // 老师费用应该是600
    expect(result[0].transportFee).toBe('100'); // 车费应该是100
    expect(result[0].customerName).toBe('JoeGong');
  });

  it('应该正确识别"报销老师100车费 给老师400"中的车费和老师费用', { timeout: 30000 }, async () => {
    const text = `山竹 12.20 23:30-0:30 问罪 淼淼上 John 600定金已付 1500尾款未付(上海1101)报销老师100车费 给老师400`;
    
    const result = await parseTransferNotes(text);
    
    expect(result.length).toBe(1);
    expect(result[0].teacherFee).toBe('400'); // 老师费用应该是400
    expect(result[0].transportFee).toBe('100'); // 车费应该是100
    expect(result[0].customerName).toBe('John');
  });

  it('应该正确识别用户提供的真实数据', { timeout: 30000 }, async () => {
    const text = `瀛姬弥音  18:40

山竹 12.20 21:30-23:30 基础局+线下乳首课   唐泽上    JoeGong 1200定金已付 1600尾款未付(上海404 )报销老师100车费 给老师600  支付宝收款`;
    
    const result = await parseTransferNotes(text);
    
    expect(result.length).toBe(1);
    expect(result[0].salesperson).toBe('山竹');
    expect(result[0].teacherFee).toBe('600'); // 老师费用应该是600,不是100
    expect(result[0].transportFee).toBe('100'); // 车费应该是100
    expect(result[0].customerName).toBe('JoeGong');
    expect(result[0].trafficSource).toBe('瀛姬弥音');
  });

  it('应该正确识别第二条真实数据', { timeout: 30000 }, async () => {
    const text = `瀛姬弥音  23:16

山竹 12.20 23:30-0:30 问罪   淼淼上    John 600定金已付 1500尾款未付(上海1101)报销老师100车费 给老师400  交易单号4200002889202512208422971999`;
    
    const result = await parseTransferNotes(text);
    
    expect(result.length).toBe(1);
    expect(result[0].salesperson).toBe('山竹');
    expect(result[0].teacherFee).toBe('400'); // 老师费用应该是400,不是100
    expect(result[0].transportFee).toBe('100'); // 车费应该是100
    expect(result[0].customerName).toBe('John');
    expect(result[0].channelOrderNo).toBe('4200002889202512208422971999');
    expect(result[0].trafficSource).toBe('瀛姬弥音');
  });

  it('应该正确处理只有老师费用没有车费的情况', { timeout: 30000 }, async () => {
    const text = `山竹 12.20 16:10-17:10基础局 韦德上 阿Q 1200全款微信已付 (上海404) 给老师300 交易单号4200002971202512209215930344`;
    
    const result = await parseTransferNotes(text);
    
    expect(result.length).toBe(1);
    expect(result[0].teacherFee).toBe('300'); // 老师费用应该是300
    expect(result[0].transportFee).toBe(''); // 没有车费,应该为空
    expect(result[0].customerName).toBe('阿Q');
  });
});
