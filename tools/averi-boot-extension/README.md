# AVERI Boot — VS Code Extension

Automatically boots the AVERI collective in the Creative Liberation Engine (Gemini Code Assist) chat panel every time VS Code opens.

## How It Works

On `onStartupFinished`, the extension waits a configurable delay (default: 2s) then calls:

```ts
vscode.commands.executeCommand('workbench.action.chat.open', {
  query: 'boot',
  isPartialQuery: false,
});
```

This opens the Creative Liberation Engine chat and submits the boot message — triggering GEMINI.md rules and the full AVERI boot sequence automatically.

## Install

```powershell
cd tools/averi-boot-extension
npm install
npm run package
# Then install the generated .vsix in VS Code:
# Extensions → ⋯ → Install from VSIX...
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `averi-boot.enabled` | `true` | Toggle auto-boot |
| `averi-boot.delayMs` | `2000` | Delay before sending (ms) |
| `averi-boot.bootMessage` | `"boot"` | Message sent to Creative Liberation Engine |

## Manual Boot

Command Palette → **AVERI: Boot Now**

Or set a keybinding to `averi-boot.bootNow`.

## Notes

- Boots once per VS Code session window (not on every file open)
- Session state is stored in workspace state — reopening the same folder won't re-boot
- Increase `delayMs` if Creative Liberation Engine hasn't loaded by the time the message fires
