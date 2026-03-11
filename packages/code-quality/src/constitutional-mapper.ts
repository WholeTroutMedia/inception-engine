/**
 * Constitutional Code Review Mapping
 * 
 * Maps ReSharper inspection categories to IE Constitutional articles.
 * Generates compliance reports per code change.
 * 
 * @package code-quality
 * @issue #34 — HELIX B
 * @agent COMET (AURORA hive)
 */

import { InspectionIssue, ConstitutionalClass } from './resharper-cli';

// ─── Constitutional Articles ────────────────────────────────

export enum ConstitutionalArticle {
  ARTICLE_1 = 'Article 1: Agent Autonomy',
  ARTICLE_2 = 'Article 2: Transparency',
  ARTICLE_3 = 'Article 3: Data Sovereignty',
  ARTICLE_4 = 'Article 4: Collaborative Integrity',
  ARTICLE_5 = 'Article 5: Resource Management',
  ARTICLE_6 = 'Article 6: Error Accountability',
  ARTICLE_7 = 'Article 7: System Integrity',
  ARTICLE_8 = 'Article 8: Evolution Rights',
}

export interface ConstitutionalViolation {
  issue: InspectionIssue;
  article: ConstitutionalArticle;
  rationale: string;
  suggestedFix?: string;
}

export interface ComplianceReport {
  timestamp: string;
  totalViolations: number;
  byArticle: Record<string, ConstitutionalViolation[]>;
  complianceScore: number; // 0-100
  passesConstitutionalReview: boolean;
  summary: string;
}

// ─── Category → Article Mapping ─────────────────────────────

const CATEGORY_ARTICLE_MAP: Record<string, ConstitutionalArticle> = {
  // Security violations → Data Sovereignty
  'Potential Code Quality Issues': ConstitutionalArticle.ARTICLE_3,
  'Security': ConstitutionalArticle.ARTICLE_3,
  'Vulnerability': ConstitutionalArticle.ARTICLE_3,
  'Cryptography': ConstitutionalArticle.ARTICLE_3,
  
  // Naming violations → System Integrity
  'Constraints Violations': ConstitutionalArticle.ARTICLE_7,
  'Naming': ConstitutionalArticle.ARTICLE_7,
  'Spelling': ConstitutionalArticle.ARTICLE_7,
  'Syntax': ConstitutionalArticle.ARTICLE_7,
  
  // Performance → Resource Management
  'Performance': ConstitutionalArticle.ARTICLE_5,
  'Redundancy': ConstitutionalArticle.ARTICLE_5,
  'Memory': ConstitutionalArticle.ARTICLE_5,
  
  // Error handling → Error Accountability
  'Exception Handling': ConstitutionalArticle.ARTICLE_6,
  'Null Reference': ConstitutionalArticle.ARTICLE_6,
  
  // Code clarity → Transparency
  'Readability': ConstitutionalArticle.ARTICLE_2,
  'Documentation': ConstitutionalArticle.ARTICLE_2,
  'Complexity': ConstitutionalArticle.ARTICLE_2,
  
  // Dependencies → Collaborative Integrity
  'Dependencies': ConstitutionalArticle.ARTICLE_4,
  'Coupling': ConstitutionalArticle.ARTICLE_4,
};

// ─── Constitutional Mapper ──────────────────────────────────

export class ConstitutionalMapper {
  /**
   * Map a set of inspection issues to constitutional violations.
   */
  mapViolations(issues: InspectionIssue[]): ConstitutionalViolation[] {
    return issues.map(issue => ({
      issue,
      article: this.resolveArticle(issue),
      rationale: this.buildRationale(issue),
      suggestedFix: undefined,
    }));
  }

  /**
   * Generate a full constitutional compliance report.
   */
  generateReport(issues: InspectionIssue[]): ComplianceReport {
    const violations = this.mapViolations(issues);
    const byArticle: Record<string, ConstitutionalViolation[]> = {};
    
    for (const v of violations) {
      if (!byArticle[v.article]) byArticle[v.article] = [];
      byArticle[v.article].push(v);
    }

    const class3Count = issues.filter(i => i.constitutionalClass === ConstitutionalClass.CLASS_3).length;
    const total = issues.length;
    const score = total === 0 ? 100 : Math.max(0, Math.round(100 - (class3Count * 20) - ((total - class3Count) * 2)));

    return {
      timestamp: new Date().toISOString(),
      totalViolations: violations.length,
      byArticle,
      complianceScore: score,
      passesConstitutionalReview: class3Count === 0,
      summary: this.buildSummary(violations, score),
    };
  }

  private resolveArticle(issue: InspectionIssue): ConstitutionalArticle {
    // Try exact category match first
    for (const [key, article] of Object.entries(CATEGORY_ARTICLE_MAP)) {
      if (issue.category.includes(key)) return article;
    }
    // Default based on severity
    if (issue.constitutionalClass === ConstitutionalClass.CLASS_3) {
      return ConstitutionalArticle.ARTICLE_7; // System Integrity
    }
    return ConstitutionalArticle.ARTICLE_2; // Transparency (general)
  }

  private buildRationale(issue: InspectionIssue): string {
    const article = this.resolveArticle(issue);
    return `[${article}] ${issue.category}: ${issue.message} (Class ${issue.constitutionalClass})`;
  }

  private buildSummary(violations: ConstitutionalViolation[], score: number): string {
    const articleCounts = new Map<string, number>();
    for (const v of violations) {
      articleCounts.set(v.article, (articleCounts.get(v.article) || 0) + 1);
    }
    const lines = [`Constitutional Compliance Score: ${score}/100`];
    for (const [article, count] of articleCounts) {
      lines.push(`  ${article}: ${count} violation(s)`);
    }
    return lines.join('\n');
  }
}

export default ConstitutionalMapper;