/**
 * ReSharper CLI Wrapper — Constitutional Code Quality Gates
 * 
 * Wraps JetBrains InspectCode CLI (2,200+ inspections, 60+ refactorings)
 * for integration with SENTINEL agent quality gates.
 * 
 * @package code-quality
 * @issue #34
 * @agent COMET (AURORA hive)
 */

import { execSync, ExecSyncOptions } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { parseStringPromise } from 'xml2js';

// ─── Types ───────────────────────────────────────────────────

export enum ConstitutionalClass {
  CLASS_1 = 1, // Suggestion — informational
  CLASS_2 = 2, // Warning — should fix
  CLASS_3 = 3, // Error — must fix, blocks merge
}

export interface InspectionIssue {
  typeId: string;
  file: string;
  line: number;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'SUGGESTION' | 'HINT';
  constitutionalClass: ConstitutionalClass;
  category: string;
}

export interface InspectionResult {
  issues: InspectionIssue[];
  totalIssues: number;
  class3Count: number;
  class2Count: number;
  class1Count: number;
  passesGate: boolean;
  timestamp: string;
  inspectedFiles: number;
}

export interface ReSharperConfig {
  inspectCodePath: string;
  solutionPath?: string;
  profilePath?: string;
  outputDir: string;
  severity: 'ERROR' | 'WARNING' | 'SUGGESTION' | 'HINT';
  include?: string[];
  exclude?: string[];
}

// ─── Severity Mapping ────────────────────────────────────────

const SEVERITY_TO_CLASS: Record<string, ConstitutionalClass> = {
  ERROR: ConstitutionalClass.CLASS_3,
  WARNING: ConstitutionalClass.CLASS_2,
  SUGGESTION: ConstitutionalClass.CLASS_1,
  HINT: ConstitutionalClass.CLASS_1,
};

// ─── ReSharper CLI Wrapper ───────────────────────────────────

export class ReSharperCLI {
  private config: ReSharperConfig;
  private outputFile: string;

  constructor(config: ReSharperConfig) {
    this.config = config;
    this.outputFile = join(config.outputDir, 'inspection-results.xml');
    if (!existsSync(config.outputDir)) {
      mkdirSync(config.outputDir, { recursive: true });
    }
  }

  /**
   * Run InspectCode CLI against a solution or project.
   * Returns structured inspection results with constitutional classification.
   */
  async inspect(targetPath?: string): Promise<InspectionResult> {
    const target = targetPath || this.config.solutionPath;
    if (!target) throw new Error('No solution/project path specified');

    const args = this.buildArgs(target);
    const cmd = `"${this.config.inspectCodePath}" ${args.join(' ')}`;

    const execOpts: ExecSyncOptions = {
      encoding: 'utf-8',
      timeout: 300_000, // 5 min timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    try {
      execSync(cmd, execOpts);
    } catch (err: any) {
      // InspectCode returns non-zero when issues found — that's expected
      if (!existsSync(this.outputFile)) {
        throw new Error(`InspectCode failed: ${err.message}`);
      }
    }

    return this.parseResults();
  }

  /**
   * Run inspection on specific files (for pre-commit hook).
   */
  async inspectFiles(files: string[]): Promise<InspectionResult> {
    const target = this.config.solutionPath;
    if (!target) throw new Error('Solution path required for file inspection');

    const includeFilter = files.map(f => `--include=${f}`).join(' ');
    const args = [...this.buildArgs(target), includeFilter];
    const cmd = `"${this.config.inspectCodePath}" ${args.join(' ')}`;

    try {
      execSync(cmd, { encoding: 'utf-8', timeout: 120_000, stdio: 'pipe' });
    } catch {
      // Expected when issues found
    }

    return this.parseResults();
  }

  /**
   * Build CLI arguments for InspectCode.
   */
  private buildArgs(target: string): string[] {
    const args: string[] = [
      `"${resolve(target)}"`,
      `--output="${this.outputFile}"`,
      `--severity=${this.config.severity}`,
      '--format=Xml',
    ];

    if (this.config.profilePath) {
      args.push(`--profile="${this.config.profilePath}"`);
    }

    if (this.config.exclude?.length) {
      this.config.exclude.forEach(pattern => {
        args.push(`--exclude=${pattern}`);
      });
    }

    return args;
  }

  /**
   * Parse XML inspection results into structured format
   * with constitutional severity classification.
   */
  private async parseResults(): Promise<InspectionResult> {
    if (!existsSync(this.outputFile)) {
      return this.emptyResult();
    }

    const xml = readFileSync(this.outputFile, 'utf-8');
    const parsed = await parseStringPromise(xml);

    const issueTypes = new Map<string, { category: string; severity: string }>();
    const typeEntries = parsed?.Report?.IssueTypes?.[0]?.IssueType || [];
    for (const t of typeEntries) {
      issueTypes.set(t.$.Id, {
        category: t.$.Category || 'Unknown',
        severity: t.$.Severity || 'SUGGESTION',
      });
    }

    const issues: InspectionIssue[] = [];
    const projects = parsed?.Report?.Issues?.[0]?.Project || [];
    for (const project of projects) {
      const projectIssues = project.Issue || [];
      for (const issue of projectIssues) {
        const typeInfo = issueTypes.get(issue.$.TypeId) || {
          category: 'Unknown',
          severity: 'SUGGESTION',
        };
        const severity = typeInfo.severity.toUpperCase() as InspectionIssue['severity'];
        issues.push({
          typeId: issue.$.TypeId,
          file: issue.$.File || '',
          line: parseInt(issue.$.Line || '0', 10),
          message: issue.$.Message || '',
          severity,
          constitutionalClass: SEVERITY_TO_CLASS[severity] || ConstitutionalClass.CLASS_1,
          category: typeInfo.category,
        });
      }
    }

    const class3 = issues.filter(i => i.constitutionalClass === ConstitutionalClass.CLASS_3).length;
    const class2 = issues.filter(i => i.constitutionalClass === ConstitutionalClass.CLASS_2).length;
    const class1 = issues.filter(i => i.constitutionalClass === ConstitutionalClass.CLASS_1).length;

    return {
      issues,
      totalIssues: issues.length,
      class3Count: class3,
      class2Count: class2,
      class1Count: class1,
      passesGate: class3 === 0,
      timestamp: new Date().toISOString(),
      inspectedFiles: new Set(issues.map(i => i.file)).size,
    };
  }

  private emptyResult(): InspectionResult {
    return {
      issues: [],
      totalIssues: 0,
      class3Count: 0,
      class2Count: 0,
      class1Count: 0,
      passesGate: true,
      timestamp: new Date().toISOString(),
      inspectedFiles: 0,
    };
  }
}

export default ReSharperCLI;