# 定时任务配置说明

## 自动优化解析规则任务

### 功能说明
- 检查未学习的修正记录数量
- 当累积10条以上时自动触发优化
- 使用notifyOwner通知管理员查看优化结果

### 手动执行
```bash
cd /home/ubuntu/course_crm
node scripts/auto-optimize-parsing.mjs
```

### 配置定时任务(每天凌晨2点执行)

#### 方法1: 使用crontab
```bash
# 编辑crontab
crontab -e

# 添加以下行(每天凌晨2点执行)
0 2 * * * cd /home/ubuntu/course_crm && node scripts/auto-optimize-parsing.mjs >> /home/ubuntu/course_crm/logs/auto-optimize.log 2>&1
```

#### 方法2: 使用PM2(推荐)
```bash
# 安装PM2
npm install -g pm2

# 配置定时任务
pm2 start scripts/auto-optimize-parsing.mjs --cron "0 2 * * *" --name "auto-optimize-parsing" --no-autorestart

# 查看任务状态
pm2 list

# 查看日志
pm2 logs auto-optimize-parsing
```

#### 方法3: 使用系统定时任务API
如果您的系统支持定时任务API,可以通过管理界面配置:
- 任务名称: 自动优化解析规则
- 执行命令: `cd /home/ubuntu/course_crm && node scripts/auto-optimize-parsing.mjs`
- Cron表达式: `0 2 * * *`
- 时区: 您的本地时区

### 日志查看
```bash
# 查看最近的日志
tail -f /home/ubuntu/course_crm/logs/auto-optimize.log

# 查看所有日志
cat /home/ubuntu/course_crm/logs/auto-optimize.log
```

### 注意事项
1. 确保数据库连接正常
2. 确保环境变量DATABASE_URL已配置
3. 确保notifyOwner API可用
4. 定时任务执行失败会记录到日志中
5. 建议定期检查日志确保任务正常运行
