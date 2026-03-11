export interface ScanViolation {
    line: number;
    value: string;
    type: 'color' | 'spacing' | 'other';
    suggestion?: string;
}
export interface ScanResult {
    file: string;
    score: number;
    violations: ScanViolation[];
}
export declare class TokenComplianceScanner {
    private LITERAL_HEX;
    private LITERAL_RGB;
    private HARDCODED_PX;
    scanFromContent(file: string, content: string): ScanResult;
    scanTsx(content: string): ScanResult;
    scanCss(content: string): ScanResult;
}
export declare function scanFile(filePath: string): ScanResult;
export declare function scanDirectory(dir: string): ScanResult[];
//# sourceMappingURL=compliance.d.ts.map