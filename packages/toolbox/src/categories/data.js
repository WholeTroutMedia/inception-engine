/**
 * @inception/toolbox — Data Utilities
 * Pure TypeScript, zero external dependencies.
 * TOOL-02: JSON pretty, YAML parse, CSV parse, markdown to HTML
 */
// ─────────────────────────────────────────────────────────────────────────────
// JSON
// ─────────────────────────────────────────────────────────────────────────────
export function jsonPretty(input, indent = 2) {
    return JSON.stringify(input, null, indent);
}
export function jsonMinify(input) {
    return JSON.stringify(JSON.parse(input));
}
export function jsonSafeParse(input) {
    try {
        return { ok: true, data: JSON.parse(input) };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// YAML — Minimal parser (handles simple single-level and nested maps)
// ─────────────────────────────────────────────────────────────────────────────
export function yamlParse(yaml) {
    const result = {};
    const lines = yaml.split('\n');
    const indentStack = [{ indent: -1, obj: result }];
    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        if (/^\s*#/.test(line) || /^\s*$/.test(line))
            continue;
        const indent = line.search(/\S/);
        const content = line.slice(indent);
        // Pop stack until current parent
        while (indentStack.length > 1 && indentStack[indentStack.length - 1].indent >= indent) {
            indentStack.pop();
        }
        const parent = indentStack[indentStack.length - 1].obj;
        const colonIdx = content.indexOf(':');
        if (colonIdx === -1)
            continue;
        const key = content.slice(0, colonIdx).trim();
        const rawVal = content.slice(colonIdx + 1).trim();
        if (rawVal === '' || rawVal === null) {
            const nested = {};
            parent[key] = nested;
            indentStack.push({ indent, obj: nested });
        }
        else if (rawVal === 'true') {
            parent[key] = true;
        }
        else if (rawVal === 'false') {
            parent[key] = false;
        }
        else if (rawVal === 'null' || rawVal === '~') {
            parent[key] = null;
        }
        else if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
            parent[key] = Number(rawVal);
        }
        else {
            parent[key] = rawVal.replace(/^['"]|['"]$/g, '');
        }
    }
    return result;
}
export function csvParse(input, delimiter = ',') {
    const lines = input.trim().split(/\r?\n/);
    if (lines.length === 0)
        return { headers: [], rows: [], rowCount: 0 };
    const parseRow = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (ch === delimiter && !inQuotes) {
                result.push(current);
                current = '';
            }
            else {
                current += ch;
            }
        }
        result.push(current);
        return result;
    };
    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
        const values = parseRow(line);
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
        return row;
    });
    return { headers, rows, rowCount: rows.length };
}
// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN → HTML (lightweight, no external deps)
// ─────────────────────────────────────────────────────────────────────────────
export function markdownToHtml(md) {
    return md
        // Headings
        .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold, italic, code
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Links and images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Blockquotes
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rules
        .replace(/^---+$/gm, '<hr>')
        // Unordered lists
        .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
        // Ordered lists 
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Paragraphs (double newlines)
        .replace(/\n\n([^<\n].+?)\n\n/gs, '\n<p>$1</p>\n')
        // Line breaks
        .replace(/  \n/g, '<br>');
}
