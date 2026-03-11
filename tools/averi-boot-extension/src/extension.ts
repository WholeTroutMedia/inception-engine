import * as vscode from 'vscode';

const EXTENSION_ID = 'averi-boot';
const STATE_KEY_LAST_BOOT_DATE = 'lastBootDate';

export function activate(context: vscode.ExtensionContext): void {
    console.log('[AVERI Boot] Extension activated via onStartupFinished');

    // Register manual "Boot Now" command
    const bootNowCmd = vscode.commands.registerCommand(`${EXTENSION_ID}.bootNow`, () => {
        sendBootMessage(context, true);
    });
    context.subscriptions.push(bootNowCmd);

    // Auto-boot on startup (once per VS Code session, not once per day)
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    const enabled = config.get<boolean>('enabled', true);

    if (enabled) {
        const delayMs = config.get<number>('delayMs', 2000);
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

async function sendBootMessage(
    context: vscode.ExtensionContext,
    isManual: boolean
): Promise<void> {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    const bootMessage = config.get<string>('bootMessage', 'boot');

    try {
        // Check if we've already booted in this VS Code session
        const sessionBooted = context.workspaceState.get<boolean>('sessionBooted', false);

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
    } catch (error) {
        // Chat panel may not be ready yet — fail silently on auto-boot, show error on manual
        if (isManual) {
            vscode.window.showErrorMessage(
                `[AVERI Boot] Failed to send boot message: ${error instanceof Error ? error.message : String(error)}`
            );
        }
        console.error('[AVERI Boot] Error sending boot message:', error);
    }
}

export function deactivate(): void {
    console.log('[AVERI Boot] Extension deactivated');
}
