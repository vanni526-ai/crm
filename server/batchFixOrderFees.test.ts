import { describe, it, expect } from 'vitest';
import { extractFeesFromText } from './batchFixOrderFees';

describe('批量修正订单费用', () => {
  describe('extractFeesFromText', () => {
    it('应该从文本中提取老师费用 - 给老师XXX格式', () => {
      const text = '昭昭 12.16 15:00-18:30 基础局 声声 北京 客户A 2500已付 给老师1260';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(1260);
    });

    it('应该从文本中提取老师费用 - 课时费XXX格式', () => {
      const text = '山竹 12.17 20:30-21:30 sp课 橘子 无锡 客户B 3600 课时费1800';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(1800);
    });

    it('应该从文本中提取老师费用 - 给老师XXX+XXX=XXX格式', () => {
      const text = '嘟嘟 12.18 18:00-20:00 女王局 皮皮 济南 客户C 4000 给老师1260+240+100=1600';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(1600);
    });

    it('应该从文本中提取车费 - 报销老师XXX车费格式', () => {
      const text = '昭昭 12.16 15:00-18:30 基础局 声声 北京 客户A 2500已付 报销老师100车费';
      const result = extractFeesFromText(text);
      expect(result.transportFee).toBe(100);
    });

    it('应该从文本中提取车费 - 老师打车XXX格式', () => {
      const text = '山竹 12.17 20:30-21:30 sp课 橘子 无锡 客户B 3600 老师打车150';
      const result = extractFeesFromText(text);
      expect(result.transportFee).toBe(150);
    });

    it('应该从文本中提取车费 - 酒店车费XXX格式', () => {
      const text = '嘟嘟 12.18 18:00-20:00 女王局 皮皮 济南 客户C 4000 酒店车费200';
      const result = extractFeesFromText(text);
      expect(result.transportFee).toBe(200);
    });

    it('应该从文本中提取车费 - XXX酒店格式', () => {
      const text = '昭昭 12.16 15:00-18:30 基础局 声声 北京 客户A 2500已付 250酒店';
      const result = extractFeesFromText(text);
      expect(result.transportFee).toBe(250);
    });

    it('应该同时提取老师费用和车费', () => {
      const text = '昭昭 12.16 15:00-18:30 基础局 声声 北京 客户A 2500已付 给老师1260 报销老师100车费';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(1260);
      expect(result.transportFee).toBe(100);
    });

    it('没有费用信息时应该返回0', () => {
      const text = '昭昭 12.16 15:00-18:30 基础局 声声 北京 客户A 2500已付';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(0);
      expect(result.transportFee).toBe(0);
    });

    it('空文本应该返回0', () => {
      const result = extractFeesFromText('');
      expect(result.teacherFee).toBe(0);
      expect(result.transportFee).toBe(0);
    });

    it('应该累加多个老师费用', () => {
      const text = '昭昭 12.16 给老师1000 再给老师500';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(1500);
    });

    it('应该累加多个车费', () => {
      const text = '昭昭 12.16 报销老师100车费 打车50';
      const result = extractFeesFromText(text);
      expect(result.transportFee).toBe(150);
    });

    it('应该支持小数金额', () => {
      const text = '昭昭 12.16 给老师1260.50 报销老师100.25车费';
      const result = extractFeesFromText(text);
      expect(result.teacherFee).toBe(1260.50);
      expect(result.transportFee).toBe(100.25);
    });
  });
});
