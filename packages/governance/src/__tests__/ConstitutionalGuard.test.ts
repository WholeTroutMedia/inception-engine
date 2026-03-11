/**
 * HELIX L: E2E Test Suite for ConstitutionalGuard + SkillEngine
 * Closes #74
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConstitutionalGuard, AmendmentProtocol, AuditTrail,
  classifyAction, CONSTITUTION_ARTICLES,
  type AgentAction, type GovernanceDecision,
} from '../ConstitutionalGuard';

const makeAction = (overrides: Partial<AgentAction> = {}): AgentAction => ({
  agentId: 'test-agent',
  actionType: 'read:data',
  target: 'memory',
  payload: null,
  timestamp: new Date().toISOString(),
  scope: ['test'],
  ...overrides,
});

describe('ConstitutionalGuard', () => {
  let guard: ConstitutionalGuard;

  beforeEach(() => { guard = new ConstitutionalGuard(); });

  describe('Action Classification', () => {
    it('classifies read actions as class1', () => {
      expect(classifyAction(makeAction())).toBe('class1');
    });
    it('classifies deploy:staging as class2', () => {
      expect(classifyAction(makeAction({ actionType: 'deploy:staging' }))).toBe('class2');
    });
    it('classifies deploy:production as class3', () => {
      expect(classifyAction(makeAction({ actionType: 'deploy:production' }))).toBe('class3');
    });
    it('classifies payment:execute as class3', () => {
      expect(classifyAction(makeAction({ actionType: 'payment:execute' }))).toBe('class3');
    });
    it('classifies install:skill as class2', () => {
      expect(classifyAction(makeAction({ actionType: 'install:skill' }))).toBe('class2');
    });
  });

  describe('Article 0 — Immutability', () => {
    it('blocks amendment of Article 0', () => {
      const decision = guard.evaluate(makeAction({
        actionType: 'amend:constitution', payload: 0, scope: ['governance'],
      }));
      expect(decision.permitted).toBe(false);
      expect(decision.violatedArticles).toContain(0);
    });
  });

  describe('Article 3 — Privacy', () => {
    it('blocks external sharing without consent', () => {
      const decision = guard.evaluate(makeAction({
        actionType: 'share:external', scope: ['data'],
      }));
      expect(decision.permitted).toBe(false);
      expect(decision.violatedArticles).toContain(3);
    });
    it('permits sharing with explicit consent', () => {
      const decision = guard.evaluate(makeAction({
        actionType: 'share:external', scope: ['data', 'consent:explicit'],
      }));
      expect(decision.violatedArticles).not.toContain(3);
    });
  });

  describe('Article 5 — Scope Validation', () => {
    it('rejects actions with empty scope', () => {
      const decision = guard.evaluate(makeAction({ scope: [] }));
      expect(decision.permitted).toBe(false);
      expect(decision.violatedArticles).toContain(5);
    });
  });

  describe('Article 6 — Resource Stewardship', () => {
    it('flags cost threshold exceeded', () => {
      const decision = guard.evaluate(makeAction({
        actionType: 'cost:exceed-threshold', scope: ['billing'],
      }));
      expect(decision.violatedArticles).toContain(6);
    });
  });

  describe('Audit Trail', () => {
    it('records all evaluations', () => {
      guard.evaluate(makeAction());
      guard.evaluate(makeAction({ actionType: 'deploy:staging', scope: ['deploy'] }));
      expect(guard.getAuditTrail()).toHaveLength(2);
    });
    it('returns frozen audit trail', () => {
      guard.evaluate(makeAction());
      const trail = guard.getAuditTrail();
      expect(Object.isFrozen(trail)).toBe(true);
    });
  });

  describe('Permitted Actions', () => {
    it('permits valid class1 actions', () => {
      const decision = guard.evaluate(makeAction());
      expect(decision.permitted).toBe(true);
      expect(decision.classification).toBe('class1');
      expect(decision.violatedArticles).toHaveLength(0);
    });
  });
});

describe('AmendmentProtocol', () => {
  let protocol: AmendmentProtocol;

  beforeEach(() => { protocol = new AmendmentProtocol(); });

  it('rejects Article 0 amendments', () => {
    expect(() => protocol.propose({
      articleId: 0, proposedText: 'New text for article 0',
      proposer: 'agent-1', rationale: 'Testing',
    })).toThrow('Article 0 is immutable');
  });

  it('supports full propose/vote/ratify lifecycle', () => {
    const proposal = protocol.propose({
      articleId: 5, proposedText: 'Updated autonomy boundaries text here',
      proposer: 'sentinel', rationale: 'Tighter scope enforcement',
    });
    expect(proposal.status).toBe('proposed');

    protocol.startVoting(0);
    protocol.vote(0, 'agent-a', 'approve');
    protocol.vote(0, 'agent-b', 'approve');
    protocol.vote(0, 'agent-c', 'reject');

    const { approved, ratio } = protocol.tally(0);
    expect(approved).toBe(true);
    expect(ratio).toBeCloseTo(0.667, 2);
  });

  it('requires human ratification', () => {
    protocol.propose({
      articleId: 1, proposedText: 'Updated sovereignty text',
      proposer: 'director', rationale: 'Clarity',
    });
    protocol.startVoting(0);
    protocol.vote(0, 'a', 'approve');
    protocol.vote(0, 'b', 'approve');
    expect(() => protocol.ratify(0)).toThrow('Human ratification required');
    protocol.humanApprove(0);
    const result = protocol.ratify(0);
    expect(result.status).toBe('ratified');
  });

  it('rejects proposals below supermajority', () => {
    protocol.propose({
      articleId: 2, proposedText: 'Updated transparency text',
      proposer: 'scribe', rationale: 'More detail',
    });
    protocol.startVoting(0);
    protocol.vote(0, 'a', 'approve');
    protocol.vote(0, 'b', 'reject');
    protocol.vote(0, 'c', 'reject');
    protocol.humanApprove(0);
    const result = protocol.ratify(0);
    expect(result.status).toBe('rejected');
  });

  it('prevents duplicate votes', () => {
    protocol.propose({
      articleId: 3, proposedText: 'New privacy text',
      proposer: 'keeper', rationale: 'Stricter',
    });
    protocol.startVoting(0);
    protocol.vote(0, 'agent-a', 'approve');
    expect(() => protocol.vote(0, 'agent-a', 'reject')).toThrow('Agent already voted');
  });
});

describe('AuditTrail', () => {
  let trail: AuditTrail;
  const mockDecision: GovernanceDecision = {
    actionId: '00000000-0000-0000-0000-000000000001',
    classification: 'class1',
    permitted: true,
    violatedArticles: [],
    reasoning: 'Test',
    signature: 'sig:test',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => { trail = new AuditTrail(); });

  it('appends entries and returns hash', () => {
    const hash = trail.append(mockDecision);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('verifies chain integrity', () => {
    trail.append(mockDecision);
    trail.append({ ...mockDecision, actionId: '00000000-0000-0000-0000-000000000002' });
    trail.append({ ...mockDecision, actionId: '00000000-0000-0000-0000-000000000003' });
    expect(trail.verify()).toBe(true);
  });

  it('returns frozen chain', () => {
    trail.append(mockDecision);
    expect(Object.isFrozen(trail.getChain())).toBe(true);
  });
});

describe('CONSTITUTION_ARTICLES', () => {
  it('has exactly 20 articles', () => {
    expect(CONSTITUTION_ARTICLES).toHaveLength(20);
  });
  it('Article 0 is marked immutable', () => {
    expect(CONSTITUTION_ARTICLES[0].immutable).toBe(true);
  });
  it('all articles have id, title, text', () => {
    for (const art of CONSTITUTION_ARTICLES) {
      expect(art.id).toBeDefined();
      expect(art.title).toBeDefined();
      expect(art.text.length).toBeGreaterThan(0);
    }
  });
});