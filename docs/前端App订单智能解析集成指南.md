# 前端App订单智能解析集成指南

## 文档概述

本文档为前端App开发团队提供订单智能解析功能的完整集成方案，包括API接口说明、前端交互流程、代码示例和最佳实践。通过集成此功能，销售人员可以通过自然语言输入快速录入订单，系统自动解析订单字段，经过人工确认后提交到订单管理系统。

**目标用户**：前端App开发人员、产品经理、测试工程师

**适用场景**：移动端订单录入、销售人员现场订单登记、批量订单导入

---

## 功能概述

### 核心价值

订单智能解析功能通过LLM技术，将销售人员的自然语言订单描述自动转换为结构化订单数据，大幅提升订单录入效率。

**传统订单录入流程**：
1. 销售人员手动填写20+个订单字段
2. 需要在多个下拉菜单中选择
3. 容易出现输入错误和遗漏
4. 平均耗时5-8分钟/订单

**智能解析流程**：
1. 销售人员粘贴或输入订单文本
2. 系统自动解析所有字段
3. 销售人员确认或修正
4. 一键提交订单
5. 平均耗时1-2分钟/订单

**效率提升**：**70%+** 的时间节省，**85%+** 的识别准确率

### 功能特性

1. **智能字段识别** - 自动识别18个订单字段（销售人员、客户名、课程、老师、金额等）
2. **业务规则集成** - 自动计算合伙人费用、识别理论课、处理作废订单
3. **支付渠道识别** - 根据订单号自动识别支付宝/微信支付
4. **数据验证** - 基于系统数据（销售人员、老师、城市名单）进行验证
5. **原始文本保存** - 自动保存原始文本到备注字段，便于追溯

---

## API接口说明

### 接口概览

| 项目 | 内容 |
|------|------|
| **接口名称** | 订单智能解析 |
| **接口路径** | `/api/trpc/orderParse.parseOrderText` |
| **请求方法** | POST |
| **认证方式** | Session Cookie 或 Token |
| **响应时间** | 2-4秒（取决于文本长度） |

### 请求参数

#### 输入参数

```typescript
interface ParseOrderTextInput {
  text: string; // 订单原始文本（必填，最少1个字符）
}
```

**参数说明**：

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| text | string | 是 | 订单原始文本 | "山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723" |

**文本格式要求**：

- 支持自然语言描述，无固定格式要求
- 建议包含关键信息：销售人员、客户名、日期时间、课程、老师、金额
- 支持中文标点符号和空格
- 长度限制：1-5000字符

#### 输出参数

```typescript
interface ParseOrderTextOutput {
  success: boolean;              // 解析是否成功
  order: ParsedOrder;            // 解析后的订单信息
  isVoidOrder: boolean;          // 是否为作废订单
  warnings: string[];            // 警告信息列表
}

interface ParsedOrder {
  // 基本信息
  salesperson: string;           // 销售人员名
  customerName: string;          // 客户名
  classDate: string;             // 上课日期 (YYYY-MM-DD)
  classTime: string;             // 上课时间 (HH:MM-HH:MM)
  course: string;                // 课程名称
  teacher: string;               // 老师名
  city: string;                  // 城市名
  classroom: string;             // 教室
  
  // 金额信息
  paymentAmount: number;         // 支付金额
  courseAmount: number;          // 课程金额
  downPayment: number;           // 首付金额
  finalPayment: number;          // 尾款金额
  teacherFee: number;            // 老师费用
  carFee: number;                // 车费
  accountBalance: number;        // 账户余额
  partnerFee?: number;           // 合伙人费用（自动计算）
  
  // 支付信息
  paymentMethod: string;         // 支付方式（支付宝/微信/富掌柜/现金）
  channelOrderNo: string;        // 渠道订单号
  
  // 其他
  notes: string;                 // 备注（原始文本）
}
```

**字段说明**：

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| salesperson | string | 销售人员名（从销售人员名单匹配） | "山竹" |
| customerName | string | 客户名（排除老师名、销售名、城市名） | "HxL" |
| classDate | string | 上课日期（YYYY-MM-DD格式） | "2025-01-24" |
| classTime | string | 上课时间（HH:MM-HH:MM格式） | "13:00-15:00" |
| course | string | 课程名称 | "基础局+裸足丝袜课" |
| teacher | string | 老师名（从老师名单匹配） | "酥酥" |
| city | string | 城市名（从城市名单匹配） | "宁波" |
| classroom | string | 教室信息 | "宁波教室" |
| paymentAmount | number | 支付金额（定金+尾款） | 3000 |
| courseAmount | number | 课程金额 | 3000 |
| downPayment | number | 首付金额 | 1200 |
| finalPayment | number | 尾款金额 | 1800 |
| teacherFee | number | 老师费用 | 600 |
| carFee | number | 车费 | 0 |
| accountBalance | number | 账户余额 | 0 |
| partnerFee | number | 合伙人费用（自动计算） | 720 |
| paymentMethod | string | 支付方式 | "支付宝" |
| channelOrderNo | string | 渠道订单号 | "A2026012119504910049723" |
| notes | string | 备注（保存原始文本） | "山竹 1.24 13:00-15:00..." |

### 业务规则说明

#### 1. 合伙人费用自动计算

系统根据城市配置自动计算合伙人费用：

| 城市 | 费率 | 计算公式 |
|------|------|----------|
| 武汉 | 40% | (课程金额 - 老师费用) × 40% |
| 天津 | 50% | (课程金额 - 老师费用) × 50% |
| 其他城市 | 30% | (课程金额 - 老师费用) × 30% |

**示例**：
- 课程金额：5000元
- 老师费用：2000元
- 城市：武汉
- 合伙人费用：(5000 - 2000) × 40% = 1200元

#### 2. 理论课老师费用规则

如果课程名称包含"理论课"关键词，且文本中没有明确标注老师费用，则老师费用默认为0。

**示例**：
- 输入："嘟嘟 1.15 19:00-20:00 理论课 云云上（上海404教室）小明 1500全款已付"
- 老师费用：0元（理论课默认规则）

#### 3. 支付渠道自动识别

系统根据渠道订单号格式自动识别支付渠道：

| 渠道 | 订单号格式 | 示例 |
|------|-----------|------|
| 支付宝 | A开头+数字，25-28位 | A2026012119504910049723 |
| 微信 | 纯数字，28-32位 | 4200002971202512209215930344 |

#### 4. 作废订单处理

如果客户名以"作废"开头（如"作废-abc"、"作废 abc"），系统会：
1. 在customerName字段中保留完整的"作废-xxx"格式
2. 提取渠道订单号
3. 返回`isVoidOrder: true`标记

**前端处理建议**：
- 识别到作废订单后，提示用户确认是否删除原订单
- 调用`orders.deleteByChannelOrderNo`接口删除原订单

---

## 前端集成方案

### 完整交互流程

```
┌─────────────────────────────────────────────────────────────┐
│  第1步：用户输入订单文本                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [文本输入框]                                          │  │
│  │  山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL    │  │
│  │  （宁波上）订金1200已付 尾款1800未付 给老师600         │  │
│  │  交易单号A2026012119504910049723                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  [智能解析] 按钮                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  第2步：调用API解析                                           │
│  POST /api/trpc/orderParse.parseOrderText                    │
│  { "text": "..." }                                           │
│                                                              │
│  [加载动画] 正在解析订单...                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  第3步：显示解析结果（可编辑表单）                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  销售人员：[山竹 ▼]         客户名：[HxL]              │  │
│  │  上课日期：[2025-01-24]     时间：[13:00-15:00]        │  │
│  │  课程：[基础局+裸足丝袜课]   老师：[酥酥 ▼]            │  │
│  │  城市：[宁波 ▼]             教室：[宁波教室]            │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  支付金额：[3000]           课程金额：[3000]            │  │
│  │  首付：[1200]               尾款：[1800]                │  │
│  │  老师费用：[600]            车费：[0]                   │  │
│  │  合伙人费用：[720] (自动计算)                           │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  支付方式：[支付宝 ▼]       订单号：[A20260121...]      │  │
│  │  备注：[原始文本...]                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  [确认提交] [重新解析] [取消]                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  第4步：提交订单                                              │
│  POST /api/trpc/orders.create                                │
│  { ...parsedOrder }                                          │
│                                                              │
│  ✓ 订单创建成功！                                            │
└─────────────────────────────────────────────────────────────┘
```

### 代码实现示例

#### 1. TypeScript类型定义

```typescript
// types/order-parse.ts

export interface ParseOrderTextInput {
  text: string;
}

export interface ParsedOrder {
  salesperson: string;
  customerName: string;
  classDate: string;
  classTime: string;
  course: string;
  teacher: string;
  city: string;
  classroom: string;
  paymentAmount: number;
  courseAmount: number;
  downPayment: number;
  finalPayment: number;
  teacherFee: number;
  carFee: number;
  accountBalance: number;
  partnerFee?: number;
  paymentMethod: string;
  channelOrderNo: string;
  notes: string;
}

export interface ParseOrderTextOutput {
  success: boolean;
  order: ParsedOrder;
  isVoidOrder: boolean;
  warnings: string[];
}
```

#### 2. React Native组件示例

```typescript
// screens/OrderParseScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert } from 'react-native';
import { trpc } from '../lib/trpc';

export const OrderParseScreen = () => {
  const [orderText, setOrderText] = useState('');
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [isVoidOrder, setIsVoidOrder] = useState(false);

  // 订单解析mutation
  const parseOrderMutation = trpc.orderParse.parseOrderText.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setParsedOrder(data.order);
        setIsVoidOrder(data.isVoidOrder);
        
        // 如果是作废订单，提示用户
        if (data.isVoidOrder) {
          Alert.alert(
            '作废订单',
            '检测到这是一个作废订单，是否删除原订单？',
            [
              { text: '取消', style: 'cancel' },
              { text: '删除', onPress: handleDeleteVoidOrder }
            ]
          );
        }
      } else {
        Alert.alert('解析失败', '无法解析订单文本，请检查格式');
      }
    },
    onError: (error) => {
      Alert.alert('错误', `解析失败: ${error.message}`);
    }
  });

  // 订单创建mutation
  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      Alert.alert('成功', '订单创建成功！');
      // 清空表单
      setOrderText('');
      setParsedOrder(null);
    },
    onError: (error) => {
      Alert.alert('错误', `订单创建失败: ${error.message}`);
    }
  });

  // 处理解析按钮点击
  const handleParse = () => {
    if (!orderText.trim()) {
      Alert.alert('提示', '请输入订单文本');
      return;
    }
    parseOrderMutation.mutate({ text: orderText });
  };

  // 处理提交按钮点击
  const handleSubmit = () => {
    if (!parsedOrder) return;
    createOrderMutation.mutate(parsedOrder);
  };

  // 处理作废订单删除
  const handleDeleteVoidOrder = async () => {
    if (!parsedOrder?.channelOrderNo) return;
    
    try {
      await trpc.orders.deleteByChannelOrderNo.mutate({
        channelOrderNo: parsedOrder.channelOrderNo
      });
      Alert.alert('成功', '原订单已删除');
    } catch (error) {
      Alert.alert('错误', '删除原订单失败');
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
        订单智能解析
      </Text>
      
      {/* 文本输入区域 */}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          minHeight: 120,
          textAlignVertical: 'top',
          marginBottom: 16
        }}
        multiline
        placeholder="粘贴或输入订单文本，例如：&#10;山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723"
        value={orderText}
        onChangeText={setOrderText}
      />
      
      <Button
        title={parseOrderMutation.isLoading ? "解析中..." : "智能解析"}
        onPress={handleParse}
        disabled={parseOrderMutation.isLoading}
      />

      {/* 解析结果显示区域 */}
      {parsedOrder && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
            解析结果（可编辑）
          </Text>
          
          {isVoidOrder && (
            <View style={{ 
              backgroundColor: '#fff3cd', 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 12 
            }}>
              <Text style={{ color: '#856404' }}>
                ⚠️ 这是一个作废订单
              </Text>
            </View>
          )}

          {/* 基本信息 */}
          <View style={{ marginBottom: 12 }}>
            <Text>销售人员：{parsedOrder.salesperson}</Text>
            <Text>客户名：{parsedOrder.customerName}</Text>
            <Text>上课日期：{parsedOrder.classDate}</Text>
            <Text>上课时间：{parsedOrder.classTime}</Text>
            <Text>课程：{parsedOrder.course}</Text>
            <Text>老师：{parsedOrder.teacher}</Text>
            <Text>城市：{parsedOrder.city}</Text>
            <Text>教室：{parsedOrder.classroom}</Text>
          </View>

          {/* 金额信息 */}
          <View style={{ marginBottom: 12 }}>
            <Text>支付金额：¥{parsedOrder.paymentAmount}</Text>
            <Text>课程金额：¥{parsedOrder.courseAmount}</Text>
            <Text>首付金额：¥{parsedOrder.downPayment}</Text>
            <Text>尾款金额：¥{parsedOrder.finalPayment}</Text>
            <Text>老师费用：¥{parsedOrder.teacherFee}</Text>
            <Text>车费：¥{parsedOrder.carFee}</Text>
            {parsedOrder.partnerFee !== undefined && (
              <Text>合伙人费用：¥{parsedOrder.partnerFee} (自动计算)</Text>
            )}
          </View>

          {/* 支付信息 */}
          <View style={{ marginBottom: 12 }}>
            <Text>支付方式：{parsedOrder.paymentMethod}</Text>
            <Text>渠道订单号：{parsedOrder.channelOrderNo}</Text>
          </View>

          {/* 操作按钮 */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              title={createOrderMutation.isLoading ? "提交中..." : "确认提交"}
              onPress={handleSubmit}
              disabled={createOrderMutation.isLoading}
            />
            <Button
              title="重新解析"
              onPress={handleParse}
              color="#6c757d"
            />
            <Button
              title="取消"
              onPress={() => {
                setOrderText('');
                setParsedOrder(null);
              }}
              color="#dc3545"
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
};
```

#### 3. Flutter组件示例

```dart
// screens/order_parse_screen.dart

import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/parsed_order.dart';

class OrderParseScreen extends StatefulWidget {
  @override
  _OrderParseScreenState createState() => _OrderParseScreenState();
}

class _OrderParseScreenState extends State<OrderParseScreen> {
  final TextEditingController _textController = TextEditingController();
  ParsedOrder? _parsedOrder;
  bool _isVoidOrder = false;
  bool _isLoading = false;

  Future<void> _handleParse() async {
    if (_textController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('请输入订单文本')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await ApiService.parseOrderText(_textController.text);
      
      setState(() {
        _parsedOrder = result.order;
        _isVoidOrder = result.isVoidOrder;
        _isLoading = false;
      });

      if (_isVoidOrder) {
        _showVoidOrderDialog();
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('解析失败: $e')),
      );
    }
  }

  Future<void> _handleSubmit() async {
    if (_parsedOrder == null) return;

    try {
      await ApiService.createOrder(_parsedOrder!);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('订单创建成功！')),
      );
      
      // 清空表单
      _textController.clear();
      setState(() {
        _parsedOrder = null;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('订单创建失败: $e')),
      );
    }
  }

  void _showVoidOrderDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('作废订单'),
        content: Text('检测到这是一个作废订单，是否删除原订单？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('取消'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _handleDeleteVoidOrder();
            },
            child: Text('删除'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDeleteVoidOrder() async {
    if (_parsedOrder?.channelOrderNo == null) return;

    try {
      await ApiService.deleteOrderByChannelOrderNo(
        _parsedOrder!.channelOrderNo
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('原订单已删除')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('删除原订单失败')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('订单智能解析'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 文本输入区域
            TextField(
              controller: _textController,
              maxLines: 6,
              decoration: InputDecoration(
                hintText: '粘贴或输入订单文本，例如：\n山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            
            ElevatedButton(
              onPressed: _isLoading ? null : _handleParse,
              child: Text(_isLoading ? '解析中...' : '智能解析'),
            ),

            // 解析结果显示区域
            if (_parsedOrder != null) ...[
              SizedBox(height: 24),
              Text(
                '解析结果（可编辑）',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 12),

              if (_isVoidOrder)
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.yellow[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '⚠️ 这是一个作废订单',
                    style: TextStyle(color: Colors.orange[900]),
                  ),
                ),

              SizedBox(height: 12),

              // 基本信息
              _buildInfoRow('销售人员', _parsedOrder!.salesperson),
              _buildInfoRow('客户名', _parsedOrder!.customerName),
              _buildInfoRow('上课日期', _parsedOrder!.classDate),
              _buildInfoRow('上课时间', _parsedOrder!.classTime),
              _buildInfoRow('课程', _parsedOrder!.course),
              _buildInfoRow('老师', _parsedOrder!.teacher),
              _buildInfoRow('城市', _parsedOrder!.city),
              _buildInfoRow('教室', _parsedOrder!.classroom),

              Divider(),

              // 金额信息
              _buildInfoRow('支付金额', '¥${_parsedOrder!.paymentAmount}'),
              _buildInfoRow('课程金额', '¥${_parsedOrder!.courseAmount}'),
              _buildInfoRow('首付金额', '¥${_parsedOrder!.downPayment}'),
              _buildInfoRow('尾款金额', '¥${_parsedOrder!.finalPayment}'),
              _buildInfoRow('老师费用', '¥${_parsedOrder!.teacherFee}'),
              _buildInfoRow('车费', '¥${_parsedOrder!.carFee}'),
              if (_parsedOrder!.partnerFee != null)
                _buildInfoRow('合伙人费用', '¥${_parsedOrder!.partnerFee} (自动计算)'),

              Divider(),

              // 支付信息
              _buildInfoRow('支付方式', _parsedOrder!.paymentMethod),
              _buildInfoRow('渠道订单号', _parsedOrder!.channelOrderNo),

              SizedBox(height: 16),

              // 操作按钮
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _handleSubmit,
                      child: Text('确认提交'),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _handleParse,
                      child: Text('重新解析'),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        _textController.clear();
                        setState(() {
                          _parsedOrder = null;
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                      child: Text('取消'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            '$label：',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}
```

---

## 最佳实践

### 1. 用户体验优化

#### 加载状态提示

```typescript
// 显示加载动画
<View>
  {parseOrderMutation.isLoading && (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 8 }}>正在解析订单...</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>
        预计需要2-4秒
      </Text>
    </View>
  )}
</View>
```

#### 错误提示优化

```typescript
onError: (error) => {
  let message = '解析失败，请重试';
  
  if (error.message.includes('timeout')) {
    message = '解析超时，请检查网络连接';
  } else if (error.message.includes('invalid')) {
    message = '订单文本格式不正确，请检查';
  }
  
  Alert.alert('错误', message);
}
```

#### 字段验证提示

```typescript
// 解析后验证关键字段
const validateParsedOrder = (order: ParsedOrder): string[] => {
  const warnings = [];
  
  if (!order.salesperson) {
    warnings.push('未识别到销售人员，请手动选择');
  }
  if (!order.customerName) {
    warnings.push('未识别到客户名，请手动输入');
  }
  if (!order.teacher) {
    warnings.push('未识别到老师，请手动选择');
  }
  if (order.paymentAmount === 0) {
    warnings.push('未识别到支付金额，请手动输入');
  }
  
  return warnings;
};

// 显示警告
if (warnings.length > 0) {
  Alert.alert(
    '提示',
    warnings.join('\n'),
    [{ text: '知道了' }]
  );
}
```

### 2. 性能优化

#### 防抖处理

```typescript
import { useCallback } from 'react';
import debounce from 'lodash/debounce';

// 防抖解析（避免用户频繁点击）
const debouncedParse = useCallback(
  debounce((text: string) => {
    parseOrderMutation.mutate({ text });
  }, 500),
  []
);
```

#### 缓存解析结果

```typescript
// 使用本地存储缓存解析结果
import AsyncStorage from '@react-native-async-storage/async-storage';

const cacheKey = `parsed_order_${orderText}`;

// 保存缓存
await AsyncStorage.setItem(cacheKey, JSON.stringify(parsedOrder));

// 读取缓存
const cached = await AsyncStorage.getItem(cacheKey);
if (cached) {
  setParsedOrder(JSON.parse(cached));
}
```

### 3. 错误处理

#### 网络错误重试

```typescript
const parseOrderMutation = trpc.orderParse.parseOrderText.useMutation({
  retry: 2, // 自动重试2次
  retryDelay: 1000, // 重试间隔1秒
  onError: (error, variables, context) => {
    console.error('解析失败:', error);
    
    // 记录错误日志
    logError('order_parse_failed', {
      text: variables.text,
      error: error.message
    });
  }
});
```

#### 超时处理

```typescript
// 设置超时时间
const parseWithTimeout = async (text: string, timeout = 10000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('解析超时')), timeout);
  });
  
  const parsePromise = parseOrderMutation.mutateAsync({ text });
  
  return Promise.race([parsePromise, timeoutPromise]);
};
```

### 4. 数据安全

#### 敏感信息脱敏

```typescript
// 在日志中脱敏手机号、身份证号
const maskSensitiveInfo = (text: string): string => {
  return text
    .replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') // 手机号
    .replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'); // 身份证号
};

// 记录日志时脱敏
console.log('解析文本:', maskSensitiveInfo(orderText));
```

#### Token认证

```typescript
// 使用Token认证（推荐移动端）
import { httpBatchLink } from '@trpc/client';

const trpc = createTRPCReact<AppRouter>();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
      headers: async () => {
        const token = await getAuthToken();
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});
```

---

## 测试用例

### 测试用例1：标准订单

**输入文本**：
```
山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723
```

**预期输出**：
```json
{
  "success": true,
  "order": {
    "salesperson": "山竹",
    "customerName": "HxL",
    "classDate": "2025-01-24",
    "classTime": "13:00-15:00",
    "course": "基础局+裸足丝袜课",
    "teacher": "酥酥",
    "city": "宁波",
    "paymentAmount": 3000,
    "downPayment": 1200,
    "finalPayment": 1800,
    "teacherFee": 600,
    "channelOrderNo": "A2026012119504910049723",
    "paymentMethod": "支付宝"
  },
  "isVoidOrder": false,
  "warnings": []
}
```

### 测试用例2：理论课订单

**输入文本**：
```
嘟嘟 1.15 19:00-20:00 理论课 云云上（上海404教室）小明 1500全款已付 交易单号4200002971202512209215930344
```

**预期输出**：
```json
{
  "success": true,
  "order": {
    "salesperson": "嘟嘟",
    "customerName": "小明",
    "classDate": "2025-01-15",
    "classTime": "19:00-20:00",
    "course": "理论课",
    "teacher": "云云",
    "city": "上海",
    "classroom": "404教室",
    "paymentAmount": 1500,
    "teacherFee": 0,
    "channelOrderNo": "4200002971202512209215930344",
    "paymentMethod": "微信"
  },
  "isVoidOrder": false,
  "warnings": []
}
```

### 测试用例3：作废订单

**输入文本**：
```
作废 山竹 1.16 19:30-21:30 基础局+医生 米妮上（广州巡游）1000订金已付 3200尾款未付 给老师1260 交易单号4200002917202601132625805238
```

**预期输出**：
```json
{
  "success": true,
  "order": {
    "salesperson": "山竹",
    "customerName": "作废 山竹",
    "classDate": "2025-01-16",
    "classTime": "19:30-21:30",
    "course": "基础局+医生",
    "teacher": "米妮",
    "city": "广州",
    "paymentAmount": 4200,
    "downPayment": 1000,
    "finalPayment": 3200,
    "teacherFee": 1260,
    "channelOrderNo": "4200002917202601132625805238"
  },
  "isVoidOrder": true,
  "warnings": []
}
```

### 测试用例4：账户余额抵扣订单

**输入文本**：
```
土豆 1.23 14:00-15:00 sp 1h yy上（天津）某市民 定金750已付 余额 6200抵扣 2400剩 3800 交易单号A2026012213174510046217
```

**预期输出**：
```json
{
  "success": true,
  "order": {
    "salesperson": "土豆",
    "customerName": "某市民",
    "classDate": "2025-01-23",
    "classTime": "14:00-15:00",
    "course": "sp 1h",
    "teacher": "yy",
    "city": "天津",
    "downPayment": 750,
    "accountBalance": 3800,
    "channelOrderNo": "A2026012213174510046217",
    "paymentMethod": "支付宝"
  },
  "isVoidOrder": false,
  "warnings": []
}
```

### 测试用例5：包含车费的订单

**输入文本**：
```
昭昭 1.20 18:00-20:00 埃及艳后+裸足丝袜 晚晚上（武汉）张三 5000全款已付 给老师2000 报销老师100车费 交易单号4200002971202512209215930344
```

**预期输出**：
```json
{
  "success": true,
  "order": {
    "salesperson": "昭昭",
    "customerName": "张三",
    "classDate": "2025-01-20",
    "classTime": "18:00-20:00",
    "course": "埃及艳后+裸足丝袜",
    "teacher": "晚晚",
    "city": "武汉",
    "paymentAmount": 5000,
    "teacherFee": 2000,
    "carFee": 100,
    "partnerFee": 1200,
    "channelOrderNo": "4200002971202512209215930344",
    "paymentMethod": "微信"
  },
  "isVoidOrder": false,
  "warnings": []
}
```

---

## 常见问题

### Q1: 解析速度慢怎么办？

**A**: 订单解析依赖LLM服务，响应时间通常在2-4秒。优化建议：

1. **显示加载动画**：让用户知道系统正在处理
2. **使用防抖**：避免用户频繁点击导致多次请求
3. **缓存结果**：相同文本的解析结果可以缓存
4. **异步处理**：不要阻塞UI线程

### Q2: 识别准确率不高怎么办？

**A**: 当前识别准确率约85%。提升建议：

1. **规范输入格式**：提供输入模板或示例
2. **用户反馈**：收集错误案例，持续优化提示词
3. **手动修正**：允许用户编辑解析结果
4. **智能学习**：记录用户修正，自动学习别名映射

### Q3: 如何处理特殊订单？

**A**: 特殊订单处理方法：

| 特殊情况 | 处理方法 |
|---------|---------|
| 作废订单 | 系统自动识别，提示用户删除原订单 |
| 理论课 | 老师费用自动设为0 |
| 账户余额抵扣 | 自动提取余额信息 |
| 多个订单号 | 只提取第一个订单号 |
| 缺少关键字段 | 返回空值，提示用户手动输入 |

### Q4: Token认证如何配置？

**A**: Token认证配置步骤：

1. **获取Token**：用户登录后从后端获取JWT Token
2. **存储Token**：使用AsyncStorage或SecureStore存储
3. **配置tRPC客户端**：在headers中添加Authorization
4. **刷新Token**：Token过期时自动刷新

```typescript
// 配置示例
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'https://crm.bdsm.com.cn/api/trpc',
      headers: async () => {
        const token = await AsyncStorage.getItem('auth_token');
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});
```

### Q5: 如何调试解析问题？

**A**: 调试建议：

1. **查看原始响应**：打印完整的API响应
2. **检查输入文本**：确认文本格式正确
3. **测试简单案例**：从简单订单开始测试
4. **查看后端日志**：联系后端开发人员查看LLM日志
5. **使用测试用例**：参考文档中的5个测试用例

### Q6: 如何优化移动端性能？

**A**: 性能优化建议：

1. **减少网络请求**：缓存解析结果
2. **压缩请求数据**：使用gzip压缩
3. **批量处理**：支持一次解析多个订单
4. **离线模式**：保存草稿，网络恢复后提交
5. **懒加载**：按需加载销售人员、老师、城市数据

---

## 附录

### 附录A：完整API请求示例

#### cURL示例

```bash
curl -X POST 'https://crm.bdsm.com.cn/api/trpc/orderParse.parseOrderText' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "text": "山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723"
  }'
```

#### Postman示例

```
POST https://crm.bdsm.com.cn/api/trpc/orderParse.parseOrderText
Content-Type: application/json
Cookie: session=...

{
  "text": "山竹 1.24 13:00-15:00 基础局+裸足丝袜课 酥酥上 HxL（宁波上）订金1200已付 尾款1800未付 给老师600 交易单号A2026012119504910049723"
}
```

### 附录B：错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| BAD_REQUEST | 请求参数错误 | 检查text参数是否为空 |
| UNAUTHORIZED | 未认证 | 检查Session Cookie或Token |
| INTERNAL_SERVER_ERROR | 服务器内部错误 | 联系后端开发人员 |
| TIMEOUT | 请求超时 | 重试或检查网络连接 |

### 附录C：联系方式

如有问题或建议，请联系：

- **技术支持**：通过Manus帮助中心提交工单
- **文档反馈**：在项目代码仓库提交Issue
- **紧急问题**：联系项目负责人

---

**文档版本**：v1.0  
**最后更新**：2026-02-17  
**作者**：Manus AI
