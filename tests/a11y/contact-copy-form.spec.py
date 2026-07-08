import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "shots"
SHOTS.mkdir(exist_ok=True)
BASE = "http://localhost:8080"

EMAIL = "prashantnadar2223@gmail.com"
PHONE = "+91 96533 86506"


async def live_texts(page):
    return await page.evaluate(
        """() => Array.from(document.querySelectorAll('[aria-live]'))
          .map(n => (n.textContent || '').trim()).filter(Boolean)"""
    )


async def read_clipboard(page):
    return await page.evaluate("() => navigator.clipboard.readText()")


async def main():
    checks = []

    def check(name, cond, info=""):
        checks.append((name, cond, info))
        print(("PASS" if cond else "FAIL"), "-", name, info)

    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        await ctx.grant_permissions(
            ["clipboard-read", "clipboard-write"], origin=BASE
        )
        page = await ctx.new_page()

        # Intercept mailto: navigations
        opened = {"url": None}
        page.on("request", lambda req: opened.update({"url": req.url}) if req.url.startswith("mailto:") else None)

        # ---------- Contact page ----------
        await page.goto(f"{BASE}/contact", wait_until="networkidle")
        await page.wait_for_selector("#name", timeout=8000)

        email_btn = page.locator('main button[aria-label="Copy email to clipboard"]').first
        # Fallback: first matching button on the page (contact-info block is above footer)
        if await email_btn.count() == 0:
            email_btn = page.locator('button[aria-label="Copy email to clipboard"]').first

        await email_btn.click()
        await page.wait_for_timeout(300)
        clip = await read_clipboard(page)
        check("copy email writes email to clipboard", clip == EMAIL, f"got={clip!r}")
        live = " | ".join(await live_texts(page))
        check("copy email announces via aria-live", "Copied email" in live, f"live={live!r}")

        phone_btn = page.locator('button[aria-label="Copy phone number to clipboard"]').first
        await phone_btn.click()
        await page.wait_for_timeout(300)
        clip = await read_clipboard(page)
        check("copy phone writes phone to clipboard", clip == PHONE, f"got={clip!r}")
        live = " | ".join(await live_texts(page))
        check("copy phone announces via aria-live", "Copied phone" in live, f"live={live!r}")

        # Icon-only: no visible "Copy" text inside button
        text_content = (await email_btn.text_content() or "").strip()
        check("copy button has no visible text (icon-only)", text_content == "", f"text={text_content!r}")

        await page.screenshot(path=str(SHOTS / "contact_copy.png"))

        # ---------- Contact form validation ----------
        await page.get_by_role("button", name="Send message").click()
        await page.wait_for_timeout(200)
        status = await page.locator('form [role="status"]').inner_text()
        check("empty submit surfaces validation status", "fix" in status.lower(), f"status={status!r}")
        errs = await page.locator('form p.text-red-600').all_inner_texts()
        check("shows 4 field errors when all empty", len(errs) >= 4, f"errs={errs}")

        # Invalid email
        await page.fill("#name", "Ada")
        await page.fill("#email", "not-an-email")
        await page.fill("#subject", "Hi there")
        await page.fill("#msg", "This is my message, hi!")
        await page.get_by_role("button", name="Send message").click()
        await page.wait_for_timeout(200)
        email_err = await page.locator("#email-err").inner_text()
        check("invalid email shows an aria-describedby error", "valid email" in email_err.lower(), f"err={email_err!r}")
        invalid = await page.get_attribute("#email", "aria-invalid")
        check("invalid email input has aria-invalid=true", invalid == "true", f"aria-invalid={invalid}")

        # Valid submit → mailto opens
        await page.fill("#email", "ada@example.com")
        await page.get_by_role("button", name="Send message").click()
        await page.wait_for_timeout(500)
        url = opened["url"] or ""
        check("valid submit triggers mailto: with correct recipient", url.startswith(f"mailto:{EMAIL}?"), f"url={url[:120]}")
        check("mailto includes prefilled subject", "subject=" in url and "UniversalTools" in url, f"url={url[:200]}")
        check("mailto includes prefilled body", "body=" in url, f"url={url[:200]}")

        await page.screenshot(path=str(SHOTS / "contact_form.png"))

        # ---------- Footer copy buttons (on Home) ----------
        await page.goto(f"{BASE}/", wait_until="networkidle")
        await page.wait_for_selector("footer button")
        f_email = page.locator('footer button[aria-label="Copy email to clipboard"]').first
        await f_email.click()
        await page.wait_for_timeout(300)
        clip = await read_clipboard(page)
        check("footer copy-email writes email to clipboard", clip == EMAIL, f"got={clip!r}")

        f_phone = page.locator('footer button[aria-label="Copy phone number to clipboard"]').first
        await f_phone.click()
        await page.wait_for_timeout(300)
        clip = await read_clipboard(page)
        check("footer copy-phone writes phone to clipboard", clip == PHONE, f"got={clip!r}")

        f_text = (await f_email.text_content() or "").strip()
        check("footer copy button is icon-only (no visible text)", f_text == "", f"text={f_text!r}")

        await page.screenshot(path=str(SHOTS / "footer_copy.png"))
        await b.close()

    passed = sum(1 for _, c, _ in checks if c)
    failed = len(checks) - passed
    print(f"\n== Results: {passed} passed, {failed} failed ==")
    if failed:
        raise SystemExit(1)


asyncio.run(main())
