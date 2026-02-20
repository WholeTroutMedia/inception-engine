# The Four Modes

Inception Engine operates in four distinct modes. Each mode activates different agents with different instructions optimized for that phase of work.

## Mode Overview

```
 IDEATE ---------> PLAN ----------> SHIP ----------> VALIDATE
 Dream it         Map it           Build it         Prove it
 Divergent        Convergent       Execution        Verification
 No limits        Every detail     Zero fluff       Ship or fix
```

You can enter any mode at any time. You can also skip modes for express workflows.

---

## IDEATE Mode

**Purpose:** Explore possibilities without constraints.

**Active Agents:**
- ATHENA (strategic vision)
- AURORA (creative direction)
- ORACLE COUNCIL (specialized expertise)
- THREE WISE MEN (advisory wisdom)

**Rules:**
- No idea is rejected
- Quantity over quality
- Cross-domain thinking encouraged
- No implementation details yet

**Outputs:**
- Concept sketches
- Feature brainstorms
- Vision documents
- Competitive analysis

**Transition to PLAN:** When ideas converge and direction is clear.

---

## PLAN Mode

**Purpose:** Transform ideas into actionable architecture.

**Active Agents:**
- ATHENA (architecture)
- KEEPER (knowledge retrieval)
- LEX (compliance check)
- SWITCHBOARD (coordination planning)

**Rules:**
- Every task must be decomposable
- Dependencies mapped explicitly
- Timeline estimates required
- Risk assessment mandatory

**Outputs:**
- Architecture diagrams
- Task breakdown
- Dependency maps
- Risk registers
- Resource allocation

**Transition to SHIP:** When plan is complete and approved.

---

## SHIP Mode

**Purpose:** Build and deploy. Nothing else matters.

**Active Agents:**
- BOLT (rapid building)
- RAM_CREW (quality assurance)
- IRIS (execution, blocker removal)
- SWITCHBOARD (coordination)
- LEX (licensing validation)

**Rules:**
- Code ships or blockers are named
- No meetings, no debates
- Exit gates MUST pass before deployment
- Quality is non-negotiable

**Exit Gates (ALL must pass):**
1. Functional completeness
2. Quality checks passing
3. Constitutional compliance
4. User intent alignment
5. No known critical issues

**Outputs:**
- Production-ready code
- Deployed applications
- Published content
- Shipped features

**Transition to VALIDATE:** Automatic upon deployment.

---

## VALIDATE Mode

**Purpose:** Verify everything works and meets standards.

**Active Agents:**
- RAM_CREW (quality validation)
- VERA (truth verification)
- ECHO (pattern analysis)
- KEEPER (documentation)

**Rules:**
- Every claim must be verifiable
- Performance metrics collected
- User feedback integrated
- Lessons learned documented

**Outputs:**
- Test results
- Performance reports
- Quality scorecards
- Improvement recommendations

**Transition:** Back to any mode based on findings.

---

## Express Workflows

You don't always need all four modes. Common shortcuts:

### Prompt to Production
```
Skip IDEATE and PLAN. Go straight to SHIP with clear requirements.
@AVERI mode SHIP
Build a REST API with user auth, CRUD for posts, and rate limiting.
```

### Research Only
```
Use IDEATE + VALIDATE only.
@AVERI mode IDEATE
Research the best approaches for real-time audio visualization.
Then validate which approach fits our stack.
```

### Architecture Review
```
Use PLAN + VALIDATE only.
@AVERI mode PLAN
Review this existing architecture for scalability issues.
```

---

## Mode Indicators

| Mode | Thinking Style | Speed | Quality Gate |
|------|---------------|-------|-------------|
| IDEATE | Divergent, creative | Fast | None |
| PLAN | Convergent, analytical | Medium | Completeness |
| SHIP | Focused, execution | Maximum | Full exit gates |
| VALIDATE | Critical, verification | Thorough | Evidence-based |

---

*Each mode is a lens, not a cage. Use what serves the work.*
