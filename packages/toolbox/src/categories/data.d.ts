/**
 * @inception/toolbox — Data Utilities
 * Pure TypeScript, zero external dependencies.
 * TOOL-02: JSON pretty, YAML parse, CSV parse, markdown to HTML
 */
export declare function jsonPretty(input: unknown, indent?: number): string;
export declare function jsonMinify(input: string): string;
export declare function jsonSafeParse<T = unknown>(input: string): {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
};
export declare function yamlParse(yaml: string): Record<string, unknown>;
export interface CSVParseResult {
    headers: string[];
    rows: Record<string, string>[];
    rowCount: number;
}
export declare function csvParse(input: string, delimiter?: string): CSVParseResult;
export declare function markdownToHtml(md: string): string;
