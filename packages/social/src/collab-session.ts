/**
 * Collaborative Session Stub
 * Coordinates multi-user sessions via WebSocket relay through
 * the existing Dispatch server at 127.0.0.1:5050.
 * Phase 1: operational data model + basic presence.
 * Phase 2: full CRDTs, Lens Protocol identity.
 * T-IECR-SOC-002
 */

export interface CollabSession {
    sessionId: string;
    projectId: string;
    host: string;
    participants: CollabParticipant[];
    mode: "observe" | "collaborate" | "present";
    createdAt: string;
    cursor?: Record<string, { x: number; y: number }>; // participant â†’ position
    activeEngine?: string;
    lastActivity: string;
}

export interface CollabParticipant {
    handle: string;
    role: "host" | "collaborator" | "observer";
    joinedAt: string;
    cursorColor: string;
    lensIdentifier?: string; // Phase 2
}

const CURSOR_COLORS = ["#e8794a", "#a78bfa", "#34d399", "#60a5fa", "#f59e0b", "#fb7185"];

// â”€â”€ Session Factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function createCollabSession(params: {
    projectId: string;
    hostHandle: string;
    mode?: CollabSession["mode"];
}): CollabSession {
    const now = new Date().toISOString();
    return {
        sessionId: `collab-${Date.now()}`,
        projectId: params.projectId,
        host: params.hostHandle,
        mode: params.mode ?? "collaborate",
        participants: [{
            handle: params.hostHandle,
            role: "host",
            joinedAt: now,
            cursorColor: CURSOR_COLORS[0],
        }],
        createdAt: now,
        lastActivity: now,
        cursor: {},
    };
}

export function addParticipant(
    session: CollabSession,
    handle: string,
    role: "collaborator" | "observer" = "collaborator"
): CollabSession {
    if (session.participants.find(p => p.handle === handle)) {
        return session; // Already joined
    }

    const colorIndex = session.participants.length % CURSOR_COLORS.length;
    const participant: CollabParticipant = {
        handle,
        role,
        joinedAt: new Date().toISOString(),
        cursorColor: CURSOR_COLORS[colorIndex],
    };

    return {
        ...session,
        participants: [...session.participants, participant],
        lastActivity: new Date().toISOString(),
    };
}

export function removeParticipant(session: CollabSession, handle: string): CollabSession {
    return {
        ...session,
        participants: session.participants.filter(p => p.handle !== handle),
        lastActivity: new Date().toISOString(),
    };
}

// Phase 2 â€” WebSocket coordination
export async function joinCollabSession(
    _sessionId: string,
    _participantHandle: string
): Promise<{ wsUrl: string; token: string }> {
    // Use typed globalThis access to avoid @types/node requirement
    const env = (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>)["process"]) as { env?: Record<string, string> } | undefined;
    const DISPATCH = env?.env?.["DISPATCH_SERVER"] ?? "http://127.0.0.1:5050";
    const wsUrl = DISPATCH.replace("http://", "ws://") + `/ws/collab/${_sessionId}`;
    return {
        wsUrl,
        token: `stub-token-${Date.now()}`, // Phase 2: proper auth token
    };
}
