/**
 * Smoke Test — validates core Phase 1 tools end-to-end.
 * Run: npx tsx tests/smoke.ts
 */

/* eslint-disable no-console */

import { BrowserEngine } from "../src/browser/engine.js";

const engine = new BrowserEngine();
let passed = 0;
let failed = 0;

function ok(label: string) {
    console.log(`  ✅ ${label}`);
    passed++;
}

function fail(label: string, err: unknown) {
    console.error(`  ❌ ${label}:`, err instanceof Error ? err.message : err);
    failed++;
}

async function runSmoke() {
    console.log("\n🚀 Inception Browser — Smoke Test\n");

    // ── Test 1: navigate ────────────────────────────────────────────────────────
    try {
        const page = await engine.getPage();
        const response = await page.goto("https://example.com", { waitUntil: "load" });
        const url = page.url();
        if (!url.includes("example.com")) throw new Error(`Unexpected URL: ${url}`);
        if ((response?.status() ?? 0) >= 400) throw new Error(`HTTP ${response?.status()}`);
        ok("browser_navigate → https://example.com");
    } catch (err) {
        fail("browser_navigate", err);
    }

    // ── Test 2: screenshot ──────────────────────────────────────────────────────
    try {
        const page = await engine.getPage();
        const buffer = await page.screenshot({ type: "png" });
        const base64 = buffer.toString("base64");
        if (base64.length < 1000) throw new Error("Screenshot too small");
        ok(`browser_screenshot → base64 PNG (${base64.length} chars)`);
    } catch (err) {
        fail("browser_screenshot", err);
    }

    // ── Test 3: text extraction ─────────────────────────────────────────────────
    try {
        const page = await engine.getPage();
        const text = await page.locator("body").innerText();
        if (!text.toLowerCase().includes("example")) throw new Error("Expected 'example' in text");
        ok(`browser_text → "${text.trim().slice(0, 60)}..."`);
    } catch (err) {
        fail("browser_text", err);
    }

    // ── Test 4: accessibility/DOM tree ─────────────────────────────────────────
    try {
        const page = await engine.getPage();
        const tree = await page.evaluate(() => {
            const body = document.body;
            return { role: 'body', name: document.title, childCount: body.children.length };
        });
        if (!tree || !tree.role) throw new Error("No DOM tree");
        ok(`browser_dom_tree → root role: "${tree.role}" (${tree.childCount} children)`);
    } catch (err) {
        fail("browser_dom_tree", err);
    }

    // ── Test 5: evaluate JS ─────────────────────────────────────────────────────
    try {
        const page = await engine.getPage();
        const title = await page.evaluate("document.title");
        if (typeof title !== "string" || !title) throw new Error("No title returned");
        ok(`browser_evaluate_js → title: "${title}"`);
    } catch (err) {
        fail("browser_evaluate_js", err);
    }

    // ── Test 6: links extraction ────────────────────────────────────────────────
    try {
        const page = await engine.getPage();
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a[href]")).map(a => ({
                text: (a as HTMLAnchorElement).textContent?.trim(),
                href: (a as HTMLAnchorElement).href,
            }));
        });
        if (!Array.isArray(links)) throw new Error("Links not an array");
        ok(`browser_get_links → ${links.length} link(s) found`);
    } catch (err) {
        fail("browser_get_links", err);
    }

    // ── Test 7: new tab ─────────────────────────────────────────────────────────
    try {
        await engine.newPage();
        const tabs = engine.listPages();
        if (tabs.length < 2) throw new Error("Expected ≥2 tabs");
        ok(`browser_new_tab → ${tabs.length} tabs now open`);
    } catch (err) {
        fail("browser_new_tab", err);
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────────
    await engine.close();

    console.log(`\n${"─".repeat(40)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.error("\n⚠️  Some tests failed. Check the errors above.\n");
        process.exit(1);
    } else {
        console.log("\n🎉 All Phase 1 smoke tests passed — inception-browser is operational!\n");
    }
}

runSmoke().catch(err => {
    console.error("Fatal smoke test error:", err);
    process.exit(1);
});
