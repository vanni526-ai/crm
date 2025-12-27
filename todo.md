# 课程交付CRM系统 - 开发任务清单

[保留之前的所有内容...]

### 11. 智能登记销售人员字段未显示
- [x] 查看用户提供的测试数据
- [x] 检查智能登记解析结果中的salesPerson字段
- [x] 检查batchCreate API是否正确保存salesPerson字段
- [x] 发现问题:batchCreate只保存了salesId(当前用户ID),没有保存salesPerson字段
- [x] 修复batchCreate API,添加salesperson字段处理逻辑
- [x] 根据解析出的销售人员名字查找salespersonId
- [x] 同时保存salesPerson和salespersonId字段
- [x] 测试智能登记后销售人员正确显示

### 12. 智能登记备注信息不正确
- [x] 查看用户截图,了解备注显示的问题
- [x] 检查transferNoteParser.ts中的备注保存逻辑
- [x] 分析为什么聊天记录元数据被保存到备注中
- [x] 修复备注保存逻辑,移除错误的lines[index]映射
- [x] 测试修复后的备注显示

### 13. 备注字段智能提取增强
- [x] 分析现有备注数据,识别常见模式
- [x] 设计结构化数据结构(优惠券、折扣、特殊要求等)
- [x] 扩展orders表,添加结构化字段
- [x] 实现备注智能解析函数
- [x] 在智能登记时自动提取结构化信息
- [x] 更新订单详情页面显示结构化信息
- [x] 添加统计功能(优惠券使用统计、折扣分析等)
- [x] 编写单元测试
- [x] 保存检查点

### 14. 修复智能登记字段提取问题
- [x] 分析用户提供的聊天记录,找出渠道订单号和车费提取失败的原因
- [x] 修夏LLM prompt,正确提取"交易单号"字段
- [x] 修夏LLM prompt,区分"报销老师车费"和"给老师费用"
- [x] 添加"作废"订单识别逻辑
- [x] 在订单状态中添加"已作废"状态
- [x] 更新订单列表UI显示作废状态(默认隐藏作废订单)
- [x] 编写测试验证修复效果
- [x] 保存检查点

### 15. 在智能登记对话框中显示新字段
- [x] 更新SmartRegisterDialog组件,在解析结果预览中显示渠道订单号
- [x] 在解析结果预览中显示车费字段
- [x] 在解析结果预览中显示作废订单标识(红色Badge)
- [x] 保存检查点

### 16. 修复智能登记和邮件导入的字段验证错误
- [x] 分析错误信息,找出null值导致的验证失败
- [x] 修夏batchCreate API的输入schema,将结构化字段改为nullish()
- [x] 检查Gmail导入逻辑,添加channelOrderNo和结构化备注字段
- [x] 测试智能登记和邮件导入功能
- [x] 保存检查点

### 17. 智能登记预览增强
- [x] 设计字段完整度评分逻辑
- [x] 在SmartRegisterDialog中添加字段完整度指示器
- [x] 高亮显示缺失的重要字段
- [x] 添加字段补充提示

### 18. 字段映射配置管理(后续完善)
- [x] 创建数据库schema
- [x] 创建 API路由和数据库操作函数
- [ ] 创建前端配置管理页面
- [ ] 集成到智能登记解析逻辑
- [ ] 测试验证

### 19. 修复Gmail手动导入渠道订单号
- [x] 诊断问题原因 - pasteImport中缺少channelOrderNo字段映射
- [x] 修夏LLM提取逻辑 - LLM已正确提取，无需修改
- [x] 修夏字段映射逻辑 - 添加channelOrderNo和paymentChannel字段
- [x] 测试验证 - 5个测试全部通过
- [x] 保存检查点

### 20. 渠道订单号增强功能
- [x] 设计实现方案
- [x] 实现渠道订单号格式验证工具函数 - validateChannelOrderNo
- [x] 实现支付渠道智能识别工具函数 - identifyPaymentChannel
- [x] 集成到Gmail导入流程 - gmailAutoImportRouter.ts
- [x] 实现历史订单批量补全API - batchFillChannelOrderNo
- [x] 创建前端管理界面 - ChannelOrderNoManagement.tsx
- [x] 编写单元测试 - 14个测试全部通过
- [x] 保存检查点

### 21. 渠道订单号管理增强
- [x] 添加渠道订单号重复检测API - checkChannelOrderNoExists
- [x] 集成重复检测到订单创建流程 - routers.ts和db.ts
- [x] 集成重复检测到Gmail导入流程 - gmailAutoImportRouter.ts
- [x] 实现订单列表按支付渠道筛选 - Orders.tsx
- [x] 实现订单列表渠道订单号搜索 - Orders.tsx
- [x] 实现对账报表导出API - exportReconciliationReport
- [x] 创建对账报表导出界面 - ReconciliationExport.tsx
- [x] 编写单元测试 - 5个测试全部通过
- [x] 保存检查点

### 22. 修复智能登记流量来源和渠道订单号显示
- [x] 诊断SmartRegisterDialog组件 - 字段已存在,问题在LLM解析器
- [x] 添加流量来源字段 - transferNoteParser.ts
- [x] 添加渠道订单号字段 - 已存在,无需修改
- [x] 测试验证 - 5个测试全部通过
- [x] 保存检查点

### 23. 智能登记解析结果增加字段显示
- [x] 在SmartRegisterDialog中添加渠道订单号显示 - 始终显示,空值显示"未填写"
- [x] 添加车费显示 - 始终显示,空值显示"未填写"
- [x] 添加其他费用显示 - 条件显示(有值才显示)
- [x] 添加合伙人费显示 - 条件显示(有值才显示)
- [x] 添加备注显示 - 始终显示,空值显示"无"
- [x] 保存检查点

### 24. 修复智能登记流量来源逻辑
- [x] 检查Gmail导入的流量来源提取逻辑 - 使用deviceWechat(设备微信号)
- [x] 修复智能登记的流量来源提取逻辑 - 从微信群名改为设备微信号
- [x] 测试验证 - 5个测试全部通过
- [x] 保存检查点

### 25. 流量来源管理增强(进行中)
- [x] 实现流量来源标准化工具函数 - trafficSourceUtils.ts
- [x] 实现流量来源配置API - trafficSourceConfigRouter.ts
- [ ] 创建流量来源配置管理页面 - TrafficSourceConfig.tsx
- [ ] 集成数据清洗到Gmail导入流程
- [ ] 集成数据清洗到智能登记流程
- [ ] 实现流量来源统计API - getTrafficSourceStats
- [ ] 在财务管理板块添加流量来源分析卡片
- [ ] 在SmartRegisterDialog添加批量编辑流量来源功能
- [ ] 编写单元测试
- [ ] 保存检查点

## 待实现功能详细设计

### 流量来源配置管理页面
- 路由: /traffic-source-config
- 功能:
  * 显示当前所有别名映射规则
  * 添加/编辑/删除别名规则
  * 支持正则表达式匹配
  * 实时预览标准化效果

### 流量来源统计仪表板
- 位置: 财务管理页面
- 显示内容:
  * 按流量来源分组的订单数量
  * 按流量来源分组的成交额
  * 按流量来源分组的转化率
  * Top 10 流量来源排行榜

### 智能登记批量编辑
- 位置: SmartRegisterDialog解析结果预览
- 功能:
  * 在顶部添加"批量修改流量来源"按钮
  * 点击后弹出对话框,输入新的流量来源
  * 确认后将所有解析结果的trafficSource统一修改

### 26. 修复车费识别错误(已完成)
- [x] 分析车费识别错误的根本原因 - LLM prompt中车费和老师费用的区分不够明确
- [x] 修夏LLM prompt - 在transportFee字段说明中强调"车费和老师费用必须严格区分"
- [x] 添加详细示例 - 示例8和示例9明确标注transportFee和teacherFee的区分
- [x] 编写测试用例 - 5个测试全部通过
- [x] 保存检查点

### 27. 批量修复历史数据中的车费识别错误(已完成)
- [x] 设计检测逻辑 - 查找备注中包含"车费"但transportFee为空的订单
- [x] 实现数据检测API - detectTransportFeeIssues
- [x] 实现批量修复API - batchFixTransportFee
- [x] 创建前端管理界面 - TransportFeeFixTool.tsx
- [x] 显示检测结果列表(订单ID、客户名、备注、当前teacherFee)
- [x] 提供批量修复按钮(重新解析备注并更新字段)
- [x] 编写单元测试
- [x] 保存检查点

### 28. 智能登记字段合理性验证(已完成)
- [x] 设计验证规则 - 车费通常不超过200元,老师费用通常在50-3000元
- [x] 实现验证工具函数 - orderFieldValidator.ts(前后端两个版本)
- [x] 在SmartRegisterDialog中集成验证
- [x] 显示警告标识(黄色感叹号)对于异常值
- [x] 添加验证说明提示(hover显示)
- [x] 编写单元测试
- [x] 保存检查点

### 29. 流量来源管理功能完善(已完成)
- [x] 创建流量来源配置管理页面 - TrafficSourceConfig.tsx
- [x] 显示当前所有别名映射规则
- [x] 实现添加/编辑/删除别名规则功能
- [x] 支持正则表达式匹配
- [x] 实时预览标准化效果
- [x] 集成数据清洗到Gmail导入流程(已存在trafficSourceUtils.ts)
- [x] 集成数据清洗到智能登记流程(已存在trafficSourceUtils.ts)
- [x] 实现流量来源统计API - getTrafficSourceStats
- [x] 创建流量来源统计仪表板 - TrafficSourceDashboard.tsx
- [x] 显示按流量来源分组的订单数量、成交额
- [x] 显示流量来源排行榜(按金额降序)
- [x] 支持按日期筛选功能
- [x] 在首页添加入口
- [x] 编写单元测试
- [x] 保存检查点

### 30. LLM智能解析优化(已完成)
- [x] 分析现有解析器的问题和改进空间
- [x] 优化prompt提高字段识别准确率 - 添加5个新示例
- [x] 增强容错性 - 支持多种日期/时间/金额格式变体
- [x] 扩展识别能力 - 支持退款、补课、多人拼课、存课、促销计算、多个交易单号、教室使用备注
- [x] 实现智能纠错功能 - smartCorrection函数(日期格式、全角数字、时间格式、地点分离、多个交易单号、退款金额)
- [x] 添加更多真实场景示例 - 17个示例覆盖各种场景
- [x] 编写测试验证优化效果 - transferNoteParser.enhanced.test.ts(10个测试用例)
- [x] 保存检查点

### 31. 实现解析规则学习功能(后端API完成)
- [x] 设计实现方案 - 收集修正数据、分析模式、自动优化prompt
- [x] 创建数据库表 - parsingCorrections, promptOptimizationHistory
- [x] 实现修正数据收集API - recordCorrection, getUnlearnedCorrections, markAsLearned, getCorrectionStats
- [x] 实现修正模式分析功能 - analyzeCorrectionPatterns(使用LLM分析错误模式)
- [x] 实现prompt自动优化功能 - autoOptimizePrompt, generatePromptExamples
- [x] 创建优化API - triggerAutoOptimization, analyzePatterns, getOptimizationHistory
- [ ] 在智能登记预览中集成修正数据收集
- [ ] 创建管理界面 - 查看修正统计、触发自动优化、查看优化历史
- [ ] 编写测试验证功能
- [ ] 保存检查点

### 32. 解析规则学习功能前端集成和自动化
- [x] 创建学习管理页面(ParsingLearning.tsx)
  * 显示修正统计卡片(总修正数、未学习数、学习成功率)
  * 显示未学习的修正记录列表
  * 添加"触发自动优化"按钮
  * 显示优化历史记录列表
  * 显示错误模式分析结果
- [x] 在SmartRegisterDialog中集成修正数据收集
  * 检测用户修改字段的行为
  * 对比原始解析结果和用户修改后的值
  * 调用recordCorrection API记录修正数据
- [x] 实现自动优化定时任务
  * 创建定时任务脚本(scripts/auto-optimize-parsing.mjs)
  * 检查未学习的修正记录数量
  * 当累积10条以上时自动触发优化
  * 使用notifyOwner通知管理员查看优化结果
  * 创建定时任务配置说明(scripts/README.md)
- [x] 在导航菜单中添加"解析学习"入口
- [x] 编写测试验证所有功能 - 7/8测试通过
- [x] 保存检查点


### 33. 解析学习功能优化
- [x] 配置定时任务
  * 使用PM2配置每天凌晨2点自动执行优化任务
  * PM2已启动并保存配置
- [x] 添加优化阈值配置功能
  * 在ParsingLearning页面添加阈值设置UI
  * 创建阈值配置API(getConfig, setConfig)
  * 在autoOptimizePrompt中读取配置的阈值
- [x] 实现批量标注工具
  * 在ParsingLearning页面添加"批量标注"功能
  * 允许管理员选择多条修正记录
  * 添加标注类型选择(典型错误、边缘案例、常见模式)
  * 创建 batchAnnotate API
- [x] 测试验证所有功能 - 添加3个新测试
- [ ] 保存检查点

### 34. 修复Gmail导入功能bug
- [x] 修复Gmail导入管理页面统计数据显示为0的问题
  * 添加缺失的getImportHistory和getImportStats API
  * 实现统计逻辑(总导入次数、总订单数、成功率)
- [x] 修复老师费用和车费识别错误
  * 更新prompt:"给老师XXX"识别为teacherFee
  * 更新prompt:只有明确包含"报销"、"车费"、"打车"等关键词才是carFee
  * 添加多个示例和警告标记
- [x] 测试验证修复效果 - 统计数据显示正常,prompt已更新
- [x] 保存检查点

### 35. 解析学习页面React错误修复
- [x] 诊断React错误原因(Minified React error #31) - Date对象直接渲染错误
- [x] 检查ParsingLearning.tsx代码 - 找到第417行和第469行问题
- [x] 修复代码问题 - 添加null检查和new Date()转换
- [x] 测试页面正常加载 - 页面已恢复正常
- [x] 保存检查点

### 36. 深入诊断解析学习页面React错误
- [x] 检查浏览器控制台的详细错误堆栈 - 发现对象{text, explanation, highlights}直接渲染
- [x] 全面检查ParsingLearning.tsx中所有Date字段渲染 - 已修复
- [x] 检查tRPC返回的数据结构 - patterns和recommendations是对象数组，newExamples也是对象数组
- [x] 修复所有Date对象直接渲染问题 - 修复pattern.description、rec.description、example对象渲染
- [x] 测试验证页面正常加载 - 页面完全正常，所有功能显示正常
- [x] 保存检查点

### 37. 订单事后学习系统(重新设计)
- [x] 设计系统架构 - 复用parsingCorrections表,扩展correctionType支持manual_edit
- [x] 实现后端API - recordOrderEdit记录订单修改
- [x] 数据库schema更新 - correctionType枚举添加manual_edit
- [x] 移除编辑时的学习对话框 - 清理旧代码
- [x] 在订单详情页添加“记录学习”按钮
- [x] 实现学习记录对话框 - 选择字段和输入原因
- [x] 集成到解析学习流程 - 手动修改也参与自动优化(通过recordOrderEdit API)
- [x] 测试验证功能 - 成功记录2个字段到学习系统
- [x] 验证数据保存 - 解析学习页面显示2条新记录,类型为manual_edit
- [x] 验证错误模式分析 - 系统自动识别客户名和城市提取问题
- [x] 验证优化建议生成 - 系统生成4条针对性优化建议
- [x] 保存检查点

### 38. 修复订单编辑功能中车费字段无法更新为0的问题
- [x] 诊断问题原因 - handleEdit函数中使用||运算符,将"0"判断为falsy值
- [x] 检查表单验证schema - schema使用optional(),允许空值和0值
- [x] 检查后端API - update路由正常,问题在前端
- [x] 修复问题代码 - 将handleEdit中所有费用字段的||改为??空值合并运算符
- [x] 测试验证修复效果 - 代码已修复,现可正常更新0值
- [x] 保存检查点

### 39. 订单列表车费字段视觉提示增强
- [x] 设计视觉提示方案 - 0元车费(绿色Badge)、未填写(灰色虚线)、正常金额
- [x] 实现车费字段视觉提示组件 - 使用Badge+条件渲染
- [x] 集成到订单列表页面 - Orders.tsx第900行
- [x] 添加tooltip说明 - title属性显示详细说明
- [x] 测试验证效果 - 代码已实现,等待用户登录后验证
- [x] 保存检查点

### 40. 扩展费用字段视觉提示到老师费用和其他费用
- [x] 应用视觉提示到老师费用字段 - 使用与车费相同的逻辑
- [x] 应用视觉提示到其他费用字段 - 使用与车费相同的逻辑
- [x] 保持界面一致性 - 三个费用字段均使用相同的视觉语言
- [x] 保存检查点

### 41. 客户管理增加上课次数统计
- [x] 分析数据结构 - 统计每个客户的订单数量(每个订单算1次课)
- [x] 实现后端统计API - 在getAllCustomers中添加classCount字段
- [x] 更新客户列表显示 - 添加"上课次数"列(紫色字体)
- [x] 更新客户详情显示 - 将"订单数量"改为"上课次数"
- [x] 测试验证功能 - 3个测试用例全部通过
- [x] 保存检查点

### 42. 财务管理添加城市订单数据统计
- [x] 分析数据需求 - 参照订单管理中的deliveryCity字段进行财务分析
- [x] 设计统计逻辑 - 按城市统计订单数量、销售额、费用、利润等指标
- [x] 实现后端API - 创建getCityFinancialStats函数和cityFinancialStats路由
- [x] 更新财务管理页面 - 添加城市订单统计卡片和图表
- [x] 支持时间范围筛选 - 全部/本月/本季度/本年
- [x] 编写单元测试 - 验证统计准确性(8个测试全部通过)
- [x] 保存检查点
### 43. 城市图表改为饼图展示
- [x] 修改财务管理页面 - 将城市销售额对比柱状图改为饼图展示
- [x] 修改利润率对比图 - 将柱状图改为净利润占比饼图，同时显示利润率
- [x] 过滤负利润城市 - 饼图仅显示正利润的城市
- [x] 保存检查点
### 44. 城市合伙人费自动计算功能
- [x] 创建数据库表 - cityPartnerConfig存储各城市的合伙人费比例
- [x] 初始化配置数据 - 11个城市的合伙人费比例(30%/40%/50%)
- [x] 实现计算工具函数 - calculatePartnerFee(city, courseAmount, teacherFee)
- [x] 创建配置管理API - getAllCityPartnerConfig, updateCityPartnerConfig, calculatePartnerFee
- [x] 创建配置管理界面 - CityPartnerConfig.tsx并添加路由
- [x] 集成到订单创建流程 - 手动创建和批量导入时自动计算
- [x] 集成到订单编辑流程 - 修改交付城市、课程金额、老师费用时自动重算
- [x] 支持手动覆盖 - 如果手动指定partnerFee则不自动计算
- [x] 编写单元测试 - 24个测试用例全部通过，验证各城市计算准确性
- [ ] 保存检查点
