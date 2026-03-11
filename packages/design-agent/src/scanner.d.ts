export interface ScanIssue {
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
}
export interface TokenScanResult {
    compliant: boolean;
    score: number;
    issues: ScanIssue[];
}
/**
 * AST-based Token Compliance Scanner
 * Scans TSX/CSS for adherence to Open Props UI foundation.
 */
export declare class TokenScanner {
    constructor();
    scan(fileName: string, fileContent: string, fileType: 'tsx' | 'css'): TokenScanResult;
}
//# sourceMappingURL=scanner.d.ts.map