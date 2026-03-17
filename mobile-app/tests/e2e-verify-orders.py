#!/usr/bin/env python3
"""
E2E test to verify orders display after login
"""

from playwright.sync_api import sync_playwright
import os

SCREENSHOTS_DIR = "/home/ubuntu/screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Collect console logs
        console_logs = []
        def log_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
        page.on("console", log_console)
        
        print("=" * 60)
        print("E2E测试：验证订单显示")
        print("=" * 60)
        
        # Step 1: Navigate to app
        print("\n[Step 1] 访问首页...")
        page.goto("https://8081-izosz67i8k9ta388b7iv0-ba0c8a2e.sg1.manus.computer/")
        page.wait_for_timeout(3000)
        
        # Step 2: Login
        print("\n[Step 2] 登录测试账号...")
        inputs = page.locator("input")
        if inputs.count() >= 2:
            inputs.nth(0).fill("test")
            inputs.nth(1).fill("123456")
            
            login_btn = page.locator("text=登 录").first
            if login_btn.is_visible():
                login_btn.click()
                page.wait_for_timeout(5000)
                print("  ✓ 登录按钮已点击")
        
        # Step 3: Navigate to bookings
        print("\n[Step 3] 访问我的预约页面...")
        bookings_tab = page.locator("text=我的预约").first
        if bookings_tab.is_visible():
            bookings_tab.click()
            print("  等待订单加载...")
            page.wait_for_timeout(20000)  # Wait longer for API response and data processing
        
        # Take screenshot
        screenshot_path = f"{SCREENSHOTS_DIR}/e2e-orders-final.png"
        page.screenshot(path=screenshot_path)
        print(f"  截图已保存: {screenshot_path}")
        
        # Check page content
        page_content = page.content()
        
        # Look for order-related content
        if "暂无预约记录" in page_content:
            print("  ⚠ 页面显示：暂无预约记录")
        elif "加载预约记录" in page_content:
            print("  ⚠ 页面仍在加载中")
        elif "订单号" in page_content or "上课时间" in page_content or "课程" in page_content:
            print("  ✓ 页面显示订单内容")
        else:
            print("  ? 无法确定页面状态")
        
        # Print relevant console logs
        print("\n[控制台日志 - orders相关]")
        for log in console_logs:
            if "orders" in log.lower() or "booking" in log.lower():
                print(f"  {log[:200]}")
        
        print("\n" + "=" * 60)
        print("E2E测试完成")
        print("=" * 60)
        
        browser.close()

if __name__ == "__main__":
    main()
