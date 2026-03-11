"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const EXTENSION_ID = 'averi-boot';
const STATE_KEY_LAST_BOOT_DATE = 'lastBootDate';
function activate(context) {
    console.log('[AVERI Boot] Extension activated via onStartupFinished');
    // Register manual "Boot Now" command
    const bootNowCmd = vscode.commands.registerCommand(`${EXTENSION_ID}.bootNow`, () => {
        sendBootMessage(context, true);
    });
    context.subscriptions.push(bootNowCmd);
    // Auto-boot on startup (once per VS Code session, not once per day)
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    const enabled = config.get('enabled', true);
    if (enabled) {
        const delayMs = config.get('delayMs', 2000);
        console.log(`[AVERI Boot] Scheduling auto-boot in ${delayMs}ms`);
        const timer = setTimeout(() => {
            sendBootMessage(context, false);
        }, delayMs);
        // Clean up timer if extension deactivates early
        context.subscriptions.push({
            dispose: () => clearTimeout(timer),
        });
    }
}
async function sendBootMessage(context, isManual) {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    const bootMessage = config.get('bootMessage', 'boot');
    try {
        // Check if we've already booted in this VS Code session
        const sessionBooted = context.workspaceState.get('sessionBooted', false);
        if (sessionBooted && !isManual) {
            console.log('[AVERI Boot] Already booted this session — skipping auto-boot');
            return;
        }
        console.log(`[AVERI Boot] Opening Creative Liberation Engine chat with message: "${bootMessage}"`);
        // Open the chat panel and send the boot message
        // isPartialQuery: false = submit immediately (no user keypress needed)
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: bootMessage,
            isPartialQuery: false,
        });
        // Mark session as booted
        await context.workspaceState.update('sessionBooted', true);
        // Store last boot timestamp
        await context.workspaceState.update(STATE_KEY_LAST_BOOT_DATE, new Date().toISOString());
        console.log('[AVERI Boot] Boot message sent successfully');
    }
    catch (error) {
        // Chat panel may not be ready yet — fail silently on auto-boot, show error on manual
        if (isManual) {
            vscode.window.showErrorMessage(`[AVERI Boot] Failed to send boot message: ${error instanceof Error ? error.message : String(error)}`);
        }
        console.error('[AVERI Boot] Error sending boot message:', error);
    }
}
function deactivate() {
    console.log('[AVERI Boot] Extension deactivated');
}
