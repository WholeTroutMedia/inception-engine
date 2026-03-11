/**
 * PatternLearner — Record + replay site interaction patterns.
 * Patterns stored in config/site-patterns.json.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PATTERNS_FILE = path.resolve(__dirname, "../../../config/site-patterns.json");

export interface PatternStep {
    tool: string;
    args: Record<string, unknown>;
}

export interface Pattern {
    name: string;
    steps: PatternStep[];
    created_at: string;
    last_used?: string;
    use_count: number;
}

export class PatternLearner {
    private async load(): Promise<Pattern[]> {
        try {
            const raw = await fs.readFile(PATTERNS_FILE, "utf-8");
            return JSON.parse(raw) as Pattern[];
        } catch {
            return [];
        }
    }

    private async save(patterns: Pattern[]): Promise<void> {
        await fs.mkdir(path.dirname(PATTERNS_FILE), { recursive: true });
        await fs.writeFile(PATTERNS_FILE, JSON.stringify(patterns, null, 2), "utf-8");
    }

    async savePattern(name: string, steps: PatternStep[]): Promise<void> {
        const patterns = await this.load();
        const existing = patterns.findIndex(p => p.name === name);
        const pattern: Pattern = {
            name,
            steps,
            created_at: new Date().toISOString(),
            use_count: 0,
        };
        if (existing >= 0) {
            patterns[existing] = pattern;
        } else {
            patterns.push(pattern);
        }
        await this.save(patterns);
    }

    async getPattern(name: string): Promise<Pattern | null> {
        const patterns = await this.load();
        const found = patterns.find(p => p.name === name);
        if (!found) return null;

        // Update last_used and use_count
        found.last_used = new Date().toISOString();
        found.use_count++;
        await this.save(patterns);

        return found;
    }

    async listPatterns(): Promise<Array<{ name: string; stepCount: number; use_count: number; created_at: string }>> {
        const patterns = await this.load();
        return patterns.map(p => ({
            name: p.name,
            stepCount: p.steps.length,
            use_count: p.use_count,
            created_at: p.created_at,
        }));
    }
}
