/**
 * LessonExtractor — W7 Coding Standards Automation (ZDNet Practice #7)
 *
 * Scans committed diffs for `// lesson:` comments and creates
 * Constitutional Article candidate issues.
 *
 * Git hook integration: called from .git/hooks/post-commit (or Forgejo CI).
 * Can also be run manually: npx tsx packages/constitution/src/lesson-extractor.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');
const LESSONS_LOG = path.join(REPO_ROOT, '.agents', 'lessons-pending.md');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Lesson {
    text: string;
    file: string;
    line: number;
    commitSha: string;
    timestamp: string;
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

function getLastCommitDiff(): string {
    try {
        return execSync('git diff HEAD~1 HEAD', {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
        });
    } catch {
        // First commit or other error — return empty
        return '';
    }
}

function getLastCommitSha(): string {
    try {
        return execSync('git rev-parse --short HEAD', {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
        }).trim();
    } catch {
        return 'unknown';
    }
}

// ─── Lesson extraction ────────────────────────────────────────────────────────

const LESSON_RE = /\/\/\s*lesson:\s*(.+)$/;

function extractLessonsFromDiff(diff: string, sha: string): Lesson[] {
    const lessons: Lesson[] = [];
    const lines = diff.split('\n');

    let currentFile = '';
    let lineNumber = 0;

    for (const line of lines) {
        // Track current file from diff header
        if (line.startsWith('+++ b/')) {
            currentFile = line.slice(6).trim();
            lineNumber = 0;
            continue;
        }

        // Track line numbers in added lines
        if (line.startsWith('@@')) {
            const match = /\+(\d+)/.exec(line);
            lineNumber = match ? parseInt(match[1], 10) - 1 : 0;
            continue;
        }

        if (line.startsWith('+')) {
            lineNumber++;
            const content = line.slice(1); // remove leading +
            const match = LESSON_RE.exec(content);
            if (match) {
                lessons.push({
                    text: match[1].trim(),
                    file: currentFile,
                    line: lineNumber,
                    commitSha: sha,
                    timestamp: new Date().toISOString(),
                });
            }
        } else if (!line.startsWith('-')) {
            lineNumber++;
        }
    }

    return lessons;
}

// ─── Output ───────────────────────────────────────────────────────────────────

function appendLessonsToLog(lessons: Lesson[]): void {
    if (lessons.length === 0) return;

    const logDir = path.dirname(LESSONS_LOG);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const entries = lessons.map(l => [
        `## Lesson Candidate — ${l.timestamp}`,
        `**Commit:** ${l.commitSha} | **File:** \`${l.file}:${l.line}\``,
        '',
        `> ${l.text}`,
        '',
        `**Status:** Pending COMPASS review`,
        `**Action:** If approved, append as Constitutional Article to \`packages/constitution/articles.md\``,
        '',
        '---',
    ].join('\n'));

    fs.appendFileSync(LESSONS_LOG, '\n' + entries.join('\n'), 'utf-8');
    console.log(`[LessonExtractor] Found ${lessons.length} lesson(s) — appended to ${LESSONS_LOG}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function extractLessonsFromLastCommit(): Lesson[] {
    const sha = getLastCommitSha();
    const diff = getLastCommitDiff();
    const lessons = extractLessonsFromDiff(diff, sha);

    if (lessons.length > 0) {
        appendLessonsToLog(lessons);
        lessons.forEach(l => {
            console.log(`  📚 Lesson found: "${l.text}" (${l.file}:${l.line})`);
        });
    }

    return lessons;
}

// Run directly if called as a script
if (process.argv[1]?.endsWith('lesson-extractor.ts') ||
    process.argv[1]?.endsWith('lesson-extractor.js')) {
    const lessons = extractLessonsFromLastCommit();
    if (lessons.length === 0) {
        console.log('[LessonExtractor] No // lesson: comments found in last commit.');
    }
    process.exit(0);
}
