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

        // Remove fallback colors like ,#1f2937 from var() inside brackets
        let newContent = content.replace(/,#[a-fA-F0-9]{3,8}(?=\)\])/g, '');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});
