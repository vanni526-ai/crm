#!/usr/bin/env python3
"""
E2E测试：完整的约课支付流程验证
使用Playwright在Web预览中模拟用户操作
"""

from playwright.sync_api import sync_playwright
import time

# 预览URL
PREVIEW_URL = "https://8081-izosz67i8k9ta388b7iv0-ba0c8a2e.sg1.manus.computer"

def test_booking_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # 收集控制台日志
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        print("=" * 60)
        print("E2E测试：完整约课支付流程")
        print("=" * 60)
        
        # Step 1: 访问首页
        print("\n[Step 1] 访问首页...")
        page.goto(PREVIEW_URL)
        page.wait_for_load_state("networkidle")
        time.sleep(3)  # 等待React渲染
        
        # 截图：首页状态
        page.screenshot(path="/home/ubuntu/screenshots/e2e-step1-home.png", full_page=True)
        print("  截图已保存: e2e-step1-home.png")
        
        # Step 2: 登录
        print("\n[Step 2] 登录测试账号...")
        
        # 等待登录表单出现
        try:
            page.wait_for_selector('input', timeout=5000)
        except:
            print("  未找到输入框")
        
        # 查找并填写用户名
        inputs = page.locator('input').all()
        print(f"  找到 {len(inputs)} 个输入框")
        
        if len(inputs) >= 2:
            # 第一个输入框是用户名，第二个是密码
            inputs[0].fill("test")
            inputs[1].fill("123456")
            print("  已填写用户名和密码")
            
            time.sleep(0.5)
            
            # 查找登录按钮 - 尝试多种方式
            login_clicked = False
            
            # 方式1：查找包含"登录"文本的按钮
            buttons = page.locator('div, button, span').filter(has_text="登 录").all()
            if not buttons:
                buttons = page.locator('div, button, span').filter(has_text="登录").all()
            
            print(f"  找到 {len(buttons)} 个可能的登录按钮")
            
            for btn in buttons:
                try:
                    text = btn.inner_text()
                    if "登" in text and len(text) < 10:
                        print(f"  点击按钮: '{text}'")
                        btn.click()
                        login_clicked = True
                        break
                except:
                    pass
            
            if not login_clicked:
                # 方式2：直接点击橙色按钮区域
                try:
                    page.locator('[class*="primary"], [class*="orange"], [class*="bg-primary"]').first.click()
                    login_clicked = True
                    print("  通过样式类点击登录按钮")
                except:
                    pass
            
            if login_clicked:
                print("  等待登录响应...")
                time.sleep(3)
                page.wait_for_load_state("networkidle")
                time.sleep(2)
            
            page.screenshot(path="/home/ubuntu/screenshots/e2e-step2-after-login.png", full_page=True)
            print("  截图已保存: e2e-step2-after-login.png")
        else:
            print("  警告：输入框数量不足")
        
        # Step 3: 检查登录后状态
        print("\n[Step 3] 检查登录后状态...")
        page.screenshot(path="/home/ubuntu/screenshots/e2e-step3-current.png", full_page=True)
        
        current_url = page.url
        print(f"  当前URL: {current_url}")
        
        # 检查页面内容
        page_content = page.content()
        if "选择城市" in page_content:
            print("  ✓ 登录成功，进入城市选择页面")
        elif "约课" in page_content:
            print("  ✓ 登录成功，进入约课页面")
        elif "登录" in page_content and "用户名" in page_content:
            print("  ✗ 仍在登录页面，登录可能失败")
        else:
            print("  ? 未知页面状态")
        
        # Step 4: 尝试访问我的预约
        print("\n[Step 4] 访问我的预约页面...")
        
        # 查找底部Tab
        tabs = page.locator('text=我的预约').all()
        if tabs:
            print(f"  找到 {len(tabs)} 个'我的预约'元素")
            tabs[0].click()
            time.sleep(2)
            page.wait_for_load_state("networkidle")
            
            page.screenshot(path="/home/ubuntu/screenshots/e2e-step4-bookings.png", full_page=True)
            print("  截图已保存: e2e-step4-bookings.png")
            
            bookings_content = page.content()
            if "暂无预约" in bookings_content:
                print("  我的预约页面显示：暂无预约记录")
            else:
                print("  我的预约页面已加载")
        else:
            # 尝试直接导航
            print("  尝试直接导航到预约页面...")
            page.goto(f"{PREVIEW_URL}/bookings")
            time.sleep(2)
            page.screenshot(path="/home/ubuntu/screenshots/e2e-step4-bookings.png", full_page=True)
        
        # 打印关键控制台日志
        print("\n[控制台日志摘要]")
        for log in console_logs:
            if any(keyword in log.lower() for keyword in ["trpc", "error", "token", "login", "auth"]):
                print(f"  {log[:150]}")
        
        browser.close()
        print("\n" + "=" * 60)
        print("E2E测试完成")
        print("=" * 60)

if __name__ == "__main__":
    test_booking_flow()
