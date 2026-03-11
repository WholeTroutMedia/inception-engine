const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir('./src', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Remove fallback colors like ,#1f2937 from brackets
        let newContent = content.replace(/,#[a-fA-F0-9]{3,8}(?=\])/g, '');

        // Fix specific cases in TokenReference.stories.tsx
        newContent = newContent.replace(/'rgba\(99,102,241,0\.08\)'/g, "'var(--inc-color-primary-subtle)'");
        newContent = newContent.replace(/'1px solid rgba\(99,102,241,0\.2\)'/g, "'1px solid var(--inc-color-primary-border)'");
        newContent = newContent.replace(/'#6366f1'/g, "'var(--inc-color-primary)'");

        // Fix Modal literal background
        newContent = newContent.replace(/bg-\[rgba\(0,0,0,0\.6\)\]/g, "bg-[var(--inc-color-surface-scrim)]");

        // Fix example in TokenReference
        newContent = newContent.replace(/'var\(--inc-color-primary, #6366f1\)'/g, "'var(--inc-color-primary)'");
        newContent = newContent.replace(/'var\(--inc-color-surface-base, #fff\)'/g, "'var(--inc-color-surface-base)'");

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});
