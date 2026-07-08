import asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "shots"
SHOTS.mkdir(exist_ok=True)
BASE = "http://localhost:8080"

async def live_texts(page):
    return await page.evaluate("""
      () => Array.from(document.querySelectorAll('[aria-live]'))
        .map(n => (n.textContent || '').trim()).filter(Boolean)
    """)

async def main():
    results = {"checks": [], "passed": 0, "failed": 0}
    def check(name, cond, info=""):
        results["checks"].append((name, cond, info))
        if cond: results["passed"] += 1
        else: results["failed"] += 1

    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        # --- 1. Text tools: spam input, last value should win ---
        await page.goto(f"{BASE}/tools/text", wait_until="domcontentloaded")
        await page.wait_for_selector("#ta", timeout=8000)
        await page.wait_for_load_state("networkidle")
        async def react_set(value):
            await page.evaluate("""
              (v) => {
                const el = document.getElementById('ta');
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
                setter.call(el, v);
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            """, value)
        for word in ["alpha","beta","gamma","delta","final-text-zeta"]:
            await react_set(word)
            await asyncio.sleep(0.02)
        await asyncio.sleep(0.6)  # let debounced compute settle
        val = await page.eval_on_selector("#ta", "el => el.value")
        check("text: latest input retained in textarea", val == "final-text-zeta", str(val)[:100])
        lives = await live_texts(page)
        stale = [l for l in lives if "alpha" in l or "beta" in l]
        check("text: no stale aria-live for earlier inputs", len(stale) == 0, str(lives)[:300])
        await page.screenshot(path=str(SHOTS / "1_text_spam.png"))

        # --- 2. Copy failure announces exact reason ---
        await page.evaluate("""
          () => {
            navigator.clipboard.writeText = () => Promise.reject(new Error('permission denied by test'));
          }
        """)
        # Find a Copy button on the page (text tools have several)
        btns = await page.locator('button[aria-label^="Copy"]').all()
        if btns:
            await btns[0].click()
            await asyncio.sleep(0.3)
            lives2 = await live_texts(page)
            joined = " | ".join(lives2)
            check("copy failure announces reason", "Copy failed: permission denied by test" in joined, joined[:300])
        else:
            check("copy failure announces reason", False, "no Copy button found on /tools/text")
        await page.screenshot(path=str(SHOTS / "2_copy_fail.png"))

        # --- 3. Download announces progress with filename ---
        await page.evaluate("""
          () => { HTMLAnchorElement.prototype.click = function(){ /* swallow */ }; }
        """)
        dbtns = await page.locator('button[aria-label^="Download"]').all()
        if dbtns:
            await dbtns[0].click()
            await asyncio.sleep(0.6)
            lives3 = await live_texts(page)
            joined3 = " | ".join(lives3)
            check("download announces completed with filename", "Download completed:" in joined3, joined3[:400])
        else:
            check("download announces completed with filename", False, "no Download button")

        # --- 4. Route switch mid-busy clears stale busy/aria-live ---
        await page.goto(f"{BASE}/tools/image", wait_until="domcontentloaded")
        await page.wait_for_selector("#img", timeout=8000)
        # simulate busy state by toggling rapidly through routes
        await page.goto(f"{BASE}/tools/text", wait_until="domcontentloaded")
        await page.wait_for_selector("#ta", timeout=8000)
        await asyncio.sleep(0.3)
        lives4 = await live_texts(page)
        joined4 = " | ".join(lives4)
        check("route switch: no Processing image text leaked into text route", "Processing image" not in joined4, joined4[:300])
        check("route switch: no Processing PDF text leaked", "Processing PDF" not in joined4, joined4[:300])
        await page.screenshot(path=str(SHOTS / "3_route_switch.png"))

        # --- 5. Spam route switches text <-> image <-> pdf ---
        for r in ["/tools/image","/tools/pdf","/tools/text","/tools/image","/tools/pdf","/tools/text"]:
            await page.goto(f"{BASE}{r}", wait_until="domcontentloaded")
            await asyncio.sleep(0.05)
        await asyncio.sleep(0.4)
        # Should now be on /tools/text; aria-live regions should not contain old route status
        final_lives = await live_texts(page)
        bad = [l for l in final_lives if "Operation complete" in l or "Operation failed" in l]
        check("spam route: no leftover PDF op status on text route", len(bad) == 0, str(final_lives)[:300])
        await page.screenshot(path=str(SHOTS / "4_spam_routes.png"))

        await b.close()

    print(f"\n=== RESULTS: {results['passed']} passed, {results['failed']} failed ===")
    for n,c,i in results["checks"]:
        print(("PASS" if c else "FAIL"), "-", n, ("" if c else f"  ::  {i}"))
    return 0 if results["failed"] == 0 else 1

import sys
sys.exit(asyncio.run(main()))
