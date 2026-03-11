import * as ts from 'typescript';
/**
 * AST-based Token Compliance Scanner
 * Scans TSX/CSS for adherence to Open Props UI foundation.
 */
export class TokenScanner {
    constructor() { }
    scan(fileName, fileContent, fileType) {
        const issues = [];
        let score = 100;
        const hardcodedColorRegex = /(#([0-9a-fA-F]{3}){1,2}\b|rgb\([^)]+\)|rgba\([^)]+\))/g;
        const lines = fileContent.split('\n');
        lines.forEach((line, index) => {
            let match;
            while ((match = hardcodedColorRegex.exec(line)) !== null) {
                issues.push({
                    file: fileName,
                    line: index + 1,
                    message: `Hardcoded color found: ${match[0]}. Use an Open Props token instead (e.g., var(--blue-5)).`,
                    severity: 'error'
                });
                score -= 10;
            }
            if (fileType === 'css') {
                if (line.includes('var(--') && !line.match(/var\(--(surface|text|brand|radius|size|font|shadow|layer|blue|red|green|yellow|gray|orange|pink|purple|teal|cyan)-/)) {
                    if (!line.includes('--') || line.trim().startsWith('--'))
                        return;
                    issues.push({
                        file: fileName,
                        line: index + 1,
                        message: `Non-standard CSS variable detected. Ensure adherence to the Open Props / KickstartDS token schema.`,
                        severity: 'warning'
                    });
                    score -= 5;
                }
            }
        });
        if (fileType === 'tsx') {
            const sourceFile = ts.createSourceFile(fileName, fileContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
            const visit = (node) => {
                if (ts.isJsxAttribute(node)) {
                    const attrName = node.name.getText(sourceFile);
                    if (attrName === 'style') {
                        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                        issues.push({
                            file: fileName,
                            line: line + 1,
                            message: `Inline style object found. Use external CSS classes mapped to tokens instead.`,
                            severity: 'warning'
                        });
                        score -= 5;
                    }
                }
                ts.forEachChild(node, visit);
            };
            visit(sourceFile);
        }
        score = Math.max(0, score);
        return {
            compliant: issues.length === 0,
            score,
            issues
        };
    }
}
//# sourceMappingURL=scanner.js.map