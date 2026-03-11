import fs from 'fs';
import path from 'path';

function findFilesRecursively(dir, filename, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                findFilesRecursively(fullPath, filename, fileList);
            } else if (file === filename) {
                fileList.push(fullPath);
            }
        }
    } catch (e) {
        // Skip inaccessible directories
    }
    return fileList;
}

console.log('[INCEPTION] Searching for tools-common files to patch in node_modules...');

try {
    const serverJsFiles = findFilesRecursively(path.resolve(process.cwd(), 'node_modules'), 'server.js');
    const analyticsJsFiles = findFilesRecursively(path.resolve(process.cwd(), 'node_modules'), 'analytics.js');

    let patchedServerCount = 0;
    let patchedAnalyticsCount = 0;

    for (const fullPath of serverJsFiles) {
        if (fullPath.includes('@genkit-ai') && fullPath.includes('tools-common') && fullPath.includes('src')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('server = app.listen(port, async () => {')) {
                content = content.replace('server = app.listen(port, async () => {', 'server = app.listen(port, "0.0.0.0", async () => {');
                fs.writeFileSync(fullPath, content);
                console.log(`[INCEPTION] Patched server binding in: ${fullPath}`);
                patchedServerCount++;
            }
            if (content.includes('server = app.listen(port, host, async () => {')) {
                // If this is a future Genkit version that already has host parameter
                console.log(`[INCEPTION] Server already supports host binding in: ${fullPath}`);
            }
        }
    }

    for (const fullPath of analyticsJsFiles) {
        if (fullPath.includes('@genkit-ai') && fullPath.includes('tools-common') && fullPath.includes('src')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('async function notifyAnalyticsIfFirstRun() {')) {
                content = content.replace('async function notifyAnalyticsIfFirstRun() {', 'async function notifyAnalyticsIfFirstRun() { return;');
                fs.writeFileSync(fullPath, content);
                console.log(`[INCEPTION] Patched analytics override in: ${fullPath}`);
                patchedAnalyticsCount++;
            }
        }
    }

    console.log(`[INCEPTION] Patching complete. Servers patched: ${patchedServerCount}. Analytics overridden: ${patchedAnalyticsCount}.`);
} catch (e) {
    console.error(`[INCEPTION] Patching encountered a non-fatal error: ${e.message}`);
}
