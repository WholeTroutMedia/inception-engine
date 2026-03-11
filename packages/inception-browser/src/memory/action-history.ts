/**
 * Action History — re-exports logging functions from session-store.ts.
 * Provides a dedicated import path for action history operations.
 */

export {
    logAction,
    queryHistory,
    type ActionRecord,
} from "./session-store.js";
