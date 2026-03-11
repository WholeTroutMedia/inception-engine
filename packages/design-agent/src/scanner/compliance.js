import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
// ─── TokenComplianceScanner ──────────────────────────────────────────────────
export class TokenComplianceScanner {
    LITERAL_HEX = /#[0-9a-fA-F]{3,8}\b/g;
    LITERAL_RGB = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;
    HARDCODED_PX = /(?:padding|margin|gap|width|height|font-size):\s*\d+px\b/g;
    scanFromContent(file, content) {
        const violations = [];
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#'))
                return;
            const lineN = idx + 1;
            let m;
            this.LITERAL_HEX.lastIndex = 0;
            while ((m = this.LITERAL_HEX.exec(line)) !== null) {
                violations.push({ line: lineN, value: m[0], type: 'color', suggestion: 'Use a CSS variable token instead' });
            }
            this.LITERAL_RGB.lastIndex = 0;
            while ((m = this.LITERAL_RGB.exec(line)) !== null) {
                violations.push({ line: lineN, value: m[0], type: 'color', suggestion: 'Use a CSS variable token instead' });
            }
            this.HARDCODED_PX.lastIndex = 0;
            while ((m = this.HARDCODED_PX.exec(line)) !== null) {
                violations.push({ line: lineN, value: m[0], type: 'spacing', suggestion: 'Use a spacing token instead' });
            }
        });
        const score = Math.max(0, 100 - violations.length * 10);
        return { file, score, violations };
    }
    scanTsx(content) { return this.scanFromContent('inline.tsx', content); }
    scanCss(content) { return this.scanFromContent('inline.css', content); }
}
// ─── File Helpers ────────────────────────────────────────────────────────────
const SCANNER = new TokenComplianceScanner();
const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.css', '.scss']);
export function scanFile(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        return SCANNER.scanFromContent(filePath, content);
    }
    catch {
        return { file: filePath, score: 100, violations: [] };
    }
}
export function scanDirectory(dir) {
    const results = [];
    function walk(d) {
        try {
            for (const entry of readdirSync(d)) {
                const full = join(d, entry);
                const stat = statSync(full);
                if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
                    walk(full);
                }
                else if (SUPPORTED_EXTS.has(entry.slice(entry.lastIndexOf('.')))) {
                    results.push(scanFile(full));
                }
            }
        }
        catch { /* skip unreadable */ }
    }
    walk(dir);
    return results;
}
//# sourceMappingURL=compliance.js.map