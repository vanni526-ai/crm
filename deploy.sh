#!/bin/bash
LOG=/var/log/crm-deploy.log
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始部署..." >> $LOG

cd /root/course_crm

# 从 Codeup master 分支拉取最新代码
git fetch origin master >> $LOG 2>&1
git reset --hard origin/master >> $LOG 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 代码拉取完成" >> $LOG

# 安装依赖
pnpm install --frozen-lockfile >> $LOG 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 依赖安装完成" >> $LOG

# 构建前后端
pnpm build >> $LOG 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 构建完成" >> $LOG

# 复制前端静态文件到 Nginx 目录
cp -r dist/public/* /var/www/course_crm/
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 前端文件已更新" >> $LOG

# 重启后端服务
pm2 restart course_crm --update-env >> $LOG 2>&1
sleep 3

# 健康检查
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 部署成功 (HTTP $HTTP)" >> $LOG
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 健康检查失败 (HTTP $HTTP)，请检查日志" >> $LOG
fi
