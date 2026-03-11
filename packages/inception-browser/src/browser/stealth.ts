/**
 * Stealth Engine — anti-detection fingerprint randomization.
 * Patches Playwright context with realistic browser signals.
 */

import type { BrowserContext } from "playwright";

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 800 },
];

const TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "America/Toronto",
    "Europe/London",
];

export function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

export interface StealthProfile {
    userAgent: string;
    viewport: { width: number; height: number };
    timezone: string;
    locale: string;
}

export function generateStealthProfile(): StealthProfile {
    return {
        userAgent: randomFrom(USER_AGENTS),
        viewport: randomFrom(VIEWPORTS),
        timezone: randomFrom(TIMEZONES),
        locale: "en-US",
    };
}

/**
 * Apply stealth init scripts to a context to bypass basic bot detection.
 * - Removes `navigator.webdriver`
 * - Spoofs consistent Chrome runtime
 * - Hides automation indicators
 */
export async function applyStealthPatches(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
        // Remove webdriver flag
        Object.defineProperty(navigator, "webdriver", {
            get: () => undefined,
            configurable: true,
        });

        // Spoof chrome runtime
        (window as unknown as { chrome?: unknown }).chrome = {
            runtime: {},
            loadTimes: () => ({}),
            csi: () => ({}),
            app: {},
        };

        // Languages
        Object.defineProperty(navigator, "languages", {
            get: () => ["en-US", "en"],
            configurable: true,
        });

        // Platform
        Object.defineProperty(navigator, "platform", {
            get: () => "Win32",
            configurable: true,
        });

        // Plugin count (real browsers have plugins)
        Object.defineProperty(navigator, "plugins", {
            get: () => [1, 2, 3, 4, 5], // Non-zero array
            configurable: true,
        });

        // Permission query — bots often fail this
        const originalQuery = window.navigator.permissions?.query;
        if (originalQuery) {
            window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
                parameters.name === "notifications"
                    ? Promise.resolve({ state: "denied" as PermissionState } as PermissionStatus)
                    : originalQuery.call(window.navigator.permissions, parameters);
        }
    });
}
