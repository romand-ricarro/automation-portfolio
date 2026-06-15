import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Check if there is any navigation or alternative way to trigger Google SSO login or reload the page
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        await page.goto('http://localhost:5173/login', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Check if there is any alternative URL or method to trigger Google SSO login or verify backend database directly
        await page.goto('http://localhost:5173/api/auth/google', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Extract content or check backend database for user_roles table to confirm first user admin role assignment
        await page.goto('http://localhost:5173/admin/users', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Attempt to access user roles via API endpoint or check database directly for user_roles table to confirm first user admin role assignment.
        await page.goto('http://localhost:5173/api/users/roles', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Try to access the database or backend directly to verify the user_roles table for the first user admin role assignment.
        await page.goto('http://localhost:5173/api/admin/user_roles', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Attempt to trigger Google SSO login flow programmatically or check backend database directly for user_roles table to confirm first user admin role assignment.
        await page.goto('http://localhost:5173/api/auth/google/callback', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Check backend database or API for user_roles table to confirm first user admin role assignment.
        await page.goto('http://localhost:5173/api/admin/users', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Try to access backend database or API to verify user_roles table for first user admin role assignment.
        await page.goto('http://localhost:5173/api/admin/user_roles', timeout=10000)
        await asyncio.sleep(3)
        

        # --> Assertions to verify final state
        try:
            await expect(page.locator('text=First User Admin Role Verified').first).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test failed: The first registered user was NOT automatically assigned the admin role as expected according to the test plan. This indicates a failure in the backend logic or database trigger responsible for role assignment.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    