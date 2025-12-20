# Gmail自动导入功能设计文档

## 功能概述
通过MCP Gmail工具自动从Gmail邮箱拉取订单邮件,解析内容并自动创建订单。

## 数据流程

### 1. 邮件拉取流程
```
用户点击"Gmail导入"按钮
  ↓
调用gmail_search_messages搜索邮件
  ↓
根据配置的查询条件过滤邮件(发件人、日期范围、标签等)
  ↓
获取邮件列表(thread_ids)
```

### 2. 邮件解析流程
```
遍历邮件列表
  ↓
调用gmail_read_threads读取完整邮件内容
  ↓
调用现有的parseGmailOrderContent函数解析订单信息
  ↓
验证客户名不是老师名(已实现)
  ↓
批量创建订单
```

### 3. 去重逻辑
- 使用邮件的Message-ID或Thread-ID作为唯一标识
- 在数据库中记录已导入的邮件ID
- 导入前检查是否已存在,避免重复导入

## MCP Gmail工具使用

### 可用工具
1. **gmail_search_messages** - 搜索和列出Gmail邮件
   - 参数: q(搜索查询), max_results(最大结果数), page_token(分页)
   - 返回: 邮件列表(包含thread_id)

2. **gmail_read_threads** - 读取Gmail线程内容
   - 参数: thread_ids(线程ID数组), include_full_messages(是否包含完整消息)
   - 返回: 完整邮件内容

### 搜索查询示例
- `from:customer@example.com` - 从特定发件人
- `subject:订单` - 标题包含"订单"
- `after:2024/01/01` - 2024年1月1日之后
- `label:orders` - 带有"orders"标签
- 组合查询: `from:customer@example.com subject:订单 after:2024/12/01`

## 数据库设计

### 新增表: gmail_import_history
```sql
CREATE TABLE gmail_import_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id VARCHAR(255) UNIQUE NOT NULL,  -- Gmail Message-ID
  thread_id VARCHAR(255) NOT NULL,          -- Gmail Thread-ID
  subject TEXT,                              -- 邮件标题
  from_email VARCHAR(255),                   -- 发件人邮箱
  order_id INT,                              -- 关联的订单ID
  import_status ENUM('success', 'failed', 'skipped'),
  error_message TEXT,                        -- 失败原因
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_message_id (message_id),
  INDEX idx_thread_id (thread_id),
  INDEX idx_imported_at (imported_at)
);
```

## 前端界面设计

### Gmail导入页面 (/gmail-import)
1. **配置区域**
   - 搜索查询输入框(支持Gmail搜索语法)
   - 日期范围选择器
   - 最大导入数量
   - 预览按钮(显示将要导入的邮件列表)

2. **操作区域**
   - 开始导入按钮
   - 进度条显示
   - 实时导入结果反馈

3. **历史记录区域**
   - 导入历史列表
   - 每条记录显示:导入时间、邮件数量、成功/失败数量
   - 查看详情按钮

## API设计

### 后端tRPC路由
```typescript
gmail: {
  // 搜索Gmail邮件(预览)
  searchMessages: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      maxResults: z.number().max(500).default(50),
    }))
    .query(async ({ input }) => {
      // 调用MCP gmail_search_messages
    }),

  // 导入Gmail邮件
  importMessages: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      maxResults: z.number().max(500).default(50),
    }))
    .mutation(async ({ input }) => {
      // 1. 搜索邮件
      // 2. 读取邮件内容
      // 3. 解析订单信息
      // 4. 批量创建订单
      // 5. 记录导入历史
    }),

  // 获取导入历史
  getImportHistory: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      // 查询gmail_import_history表
    }),
}
```

## 实现步骤

### Phase 1: 后端基础设施
1. 创建gmail_import_history表
2. 实现MCP Gmail工具调用封装函数
3. 实现邮件搜索和读取逻辑

### Phase 2: 解析和导入逻辑
1. 复用现有的parseGmailOrderContent函数
2. 实现批量订单创建
3. 实现去重逻辑
4. 记录导入历史

### Phase 3: 前端界面
1. 创建Gmail导入配置界面
2. 实现邮件预览功能
3. 实现导入进度显示
4. 实现导入历史查看

### Phase 4: 测试和优化
1. 测试Gmail OAuth授权
2. 测试邮件搜索和过滤
3. 测试批量导入性能
4. 优化错误处理

## 注意事项

1. **OAuth授权** - MCP Gmail工具会自动处理OAuth授权流程
2. **API配额** - Gmail API有配额限制,需要合理控制请求频率
3. **错误处理** - 邮件解析可能失败,需要记录失败原因
4. **性能优化** - 批量处理邮件时注意性能,避免超时
5. **数据安全** - 邮件内容可能包含敏感信息,需要妥善处理
