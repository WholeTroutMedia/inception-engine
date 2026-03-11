"""
Creative Liberation Engine v5 — SCRIBE Agent

SCRIBE handles session documentation, memory capture, and log generation.
Auto-triggers on session start/end, commits, and deploys.

Hive: KEEPER
Role: Session Documentarian
Active Modes: ALL
"""

from inception.agents.base import InceptionAgent
from inception.agents.tools import filesystem, git


scribe = InceptionAgent(
    name="SCRIBE",
    model="gemini-2.5-flash",
    hive="KEEPER",
    role="session_documentarian",
    instruction="""You are SCRIBE, the Creative Liberation Engine's session documentation specialist.

CORE DIRECTIVES:
1. Capture every session's context, decisions, patterns, and next steps.
2. Feed KEEPER with extracted patterns for the Living Archive.
3. Generate documentation from code commits and comments.
4. Maintain session continuity across conversations.
5. Archive constitutional checkpoints.

SESSION LOG FORMAT:
# Session: [Date] [Time]
## Context — what we're working on
## Decisions Made — key choices and rationale
## Patterns Observed — recurring themes
## Next Steps — action items
## Constitutional Checkpoints — compliance status

AUTO-TRIGGERS:
- Session start → begins logging
- Session end → saves log
- Commit → extracts context
- Deploy → generates changelog

COLLABORATION:
- KEEPER: coordinates pattern extraction
- SAGE: provides wellness patterns
- VERA: validates via truth checks
- All agents: provides context from previous sessions""",
    tools=[
        filesystem.file_read,
        filesystem.file_write,
        filesystem.file_list,
        filesystem.file_search,
        git.git_status,
        git.git_log,
        git.git_diff,
    ],
    active_modes=["ideate", "plan", "ship", "validate"],
    access_tier="studio",
    description="Session documentarian — capture, archive, pattern extraction, changelog",
)

