#!/usr/bin/env python3
"""
Debug script to capture the exact URL being sent for orders.list
"""

from playwright.sync_api import sync_playwright
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Capture all network requests
        requests_log = []
        
        def log_request(request):
            if 'orders.list' in request.url:
                requests_log.append({
                    'url': request.url,
                    'method': request.method,
                })
                print(f"\n[CAPTURED] orders.list request:")
                print(f"  URL: {request.url}")
                print(f"  Method: {request.method}")
                
                # Parse URL to check for token
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(request.url)
                query_params = parse_qs(parsed.query)
                print(f"  Query params: {list(query_params.keys())}")
                if 'token' in query_params:
                    token = query_params['token'][0]
                    print(f"  Token: {token[:50]}...")
                else:
                    print(f"  Token: NOT FOUND IN URL!")
        
        page.on("request", log_request)
        
        # Navigate to app
        print("Navigating to app...")
        page.goto("https://8081-izosz67i8k9ta388b7iv0-ba0c8a2e.sg1.manus.computer/")
        page.wait_for_timeout(3000)
        
        # Login
        print("Logging in...")
        inputs = page.locator("input")
        if inputs.count() >= 2:
            inputs.nth(0).fill("test")
            inputs.nth(1).fill("123456")
            
            # Click login button
            login_btn = page.locator("text=登 录").first
            if login_btn.is_visible():
                login_btn.click()
                page.wait_for_timeout(5000)
        
        # Navigate to bookings page
        print("Navigating to bookings page...")
        bookings_tab = page.locator("text=我的预约").first
        if bookings_tab.is_visible():
            bookings_tab.click()
            page.wait_for_timeout(5000)
        
        print(f"\nTotal orders.list requests captured: {len(requests_log)}")
        
        browser.close()

if __name__ == "__main__":
    main()
