#!/bin/bash

###############################################################################
# 瀛姬课程预约系统 - 应用启动脚本
# 
# 用途：在沙盒中持续运行应用，并暴露端口供外部访问
# 
# 使用方法：
#   ./start-app.sh          # 启动应用
#   ./start-app.sh stop     # 停止应用
#   ./start-app.sh status   # 查看应用状态
#   ./start-app.sh logs     # 查看应用日志
###############################################################################

set -e

PROJECT_DIR="/home/ubuntu/course-booking-mobile"
PID_FILE="/tmp/course-booking-app.pid"
LOG_FILE="/tmp/course-booking-app.log"
API_PORT=3000
METRO_PORT=8081

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 函数：清理环境
cleanup_environment() {
    print_info "清理环境..."
    
    # 杀死残留的 node 进程
    killall -9 node 2>/dev/null || true
    killall -9 chromium-browser 2>/dev/null || true
    
    # 清理缓存
    rm -rf "$PROJECT_DIR/.expo" 2>/dev/null || true
    rm -rf "$PROJECT_DIR/node_modules/.cache" 2>/dev/null || true
    
    sleep 2
    print_info "环境清理完成"
}

# 函数：检查文件描述符
check_file_descriptors() {
    local fd_count=$(lsof 2>/dev/null | wc -l)
    print_info "当前打开文件数: $fd_count"
    
    if [ "$fd_count" -gt 30000 ]; then
        print_warning "文件描述符数量过多 (> 30,000)，系统可能不稳定"
        return 1
    fi
    return 0
}

# 函数：启动应用
start_app() {
    print_info "启动应用..."
    
    # 检查是否已经运行
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            print_warning "应用已在运行 (PID: $old_pid)"
            return 0
        fi
    fi
    
    # 清理环境
    cleanup_environment
    
    # 检查文件描述符
    if ! check_file_descriptors; then
        print_error "文件描述符过多，启动失败"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    # 启动应用（后台运行）
    print_info "启动 API Server 和 Metro Bundler..."
    PORT=$API_PORT EXPO_USE_METRO_WORKSPACE_ROOT=1 pnpm dev > "$LOG_FILE" 2>&1 &
    
    local app_pid=$!
    echo "$app_pid" > "$PID_FILE"
    
    print_info "应用已启动 (PID: $app_pid)"
    
    # 等待服务启动
    print_info "等待服务启动..."
    sleep 10
    
    # 检查服务是否正常运行
    if lsof -i :$API_PORT > /dev/null 2>&1; then
        print_info "✅ API Server 已启动 (端口 $API_PORT)"
    else
        print_error "❌ API Server 启动失败"
        return 1
    fi
    
    if lsof -i :$METRO_PORT > /dev/null 2>&1; then
        print_info "✅ Metro Bundler 已启动 (端口 $METRO_PORT)"
    else
        print_error "❌ Metro Bundler 启动失败"
        return 1
    fi
    
    print_info "应用启动成功！"
    return 0
}

# 函数：停止应用
stop_app() {
    print_info "停止应用..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -9 "$pid" 2>/dev/null || true
            print_info "应用已停止"
        fi
        rm -f "$PID_FILE"
    fi
    
    # 清理所有 node 进程
    killall -9 node 2>/dev/null || true
    killall -9 chromium-browser 2>/dev/null || true
    
    print_info "清理完成"
}

# 函数：查看应用状态
status_app() {
    print_info "应用状态检查..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_info "✅ 应用正在运行 (PID: $pid)"
        else
            print_error "❌ 应用未运行 (PID 文件存在但进程已停止)"
            return 1
        fi
    else
        print_error "❌ 应用未运行"
        return 1
    fi
    
    # 检查端口
    if lsof -i :$API_PORT > /dev/null 2>&1; then
        print_info "✅ API Server 正在监听端口 $API_PORT"
    else
        print_error "❌ API Server 未在监听端口 $API_PORT"
    fi
    
    if lsof -i :$METRO_PORT > /dev/null 2>&1; then
        print_info "✅ Metro Bundler 正在监听端口 $METRO_PORT"
    else
        print_error "❌ Metro Bundler 未在监听端口 $METRO_PORT"
    fi
    
    # 检查文件描述符
    check_file_descriptors
    
    return 0
}

# 函数：查看日志
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        print_info "显示最近 50 行日志："
        tail -50 "$LOG_FILE"
    else
        print_error "日志文件不存在"
        return 1
    fi
}

# 主函数
main() {
    case "${1:-start}" in
        start)
            start_app
            ;;
        stop)
            stop_app
            ;;
        status)
            status_app
            ;;
        logs)
            show_logs
            ;;
        restart)
            stop_app
            sleep 2
            start_app
            ;;
        *)
            print_error "未知命令: $1"
            echo "用法: $0 {start|stop|status|logs|restart}"
            exit 1
            ;;
    esac
}

main "$@"
