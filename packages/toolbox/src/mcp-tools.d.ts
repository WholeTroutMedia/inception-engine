/**
 * TOOL-03: Register @inception/toolbox functions as Genkit tools
 * packages/toolbox/src/mcp-tools.ts
 *
 * Wraps pure toolbox functions as Genkit tool definitions so agents
 * can call them directly during AI generation (no HTTP required).
 *
 * API surface locked to on-disk category exports (verified 2026-03-07).
 */
import { z } from 'genkit';
export declare const videoFormatInfoTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        extension: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        extension: string;
    }, {
        extension: string;
    }>;
    fn: ({ extension }: {
        extension: string;
    }) => import("./index.js").VideoFormatInfo | {
        error: string;
    };
};
export declare const imageCompressTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        originalBytes: z.ZodNumber;
        targetFormat: z.ZodEnum<["jpeg", "webp", "avif", "png"]>;
        quality: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        quality: number;
        originalBytes: number;
        targetFormat: "jpeg" | "png" | "webp" | "avif";
    }, {
        originalBytes: number;
        targetFormat: "jpeg" | "png" | "webp" | "avif";
        quality?: number | undefined;
    }>;
    fn: ({ originalBytes, targetFormat, quality }: {
        originalBytes: number;
        targetFormat: "jpeg" | "webp" | "avif" | "png";
        quality?: number;
    }) => import("./index.js").ImageCompressEstimate;
};
export declare const svgOptimizeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        svg: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        svg: string;
    }, {
        svg: string;
    }>;
    fn: ({ svg }: {
        svg: string;
    }) => {
        optimized: string;
        originalLength: number;
    };
};
export declare const audioDurationTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => {
        seconds: number;
        formatted: string;
        valid: boolean;
    } | {
        seconds: null;
        formatted: null;
        valid: boolean;
    };
};
export declare const jsonPrettyTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        json: z.ZodString;
        indent: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        json: string;
        indent: number;
    }, {
        json: string;
        indent?: number | undefined;
    }>;
    fn: ({ json, indent }: {
        json: string;
        indent?: number;
    }) => string;
};
export declare const csvParseTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        csv: z.ZodString;
        delimiter: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        csv: string;
        delimiter: string;
    }, {
        csv: string;
        delimiter?: string | undefined;
    }>;
    fn: ({ csv, delimiter }: {
        csv: string;
        delimiter?: string;
    }) => import("./index.js").CSVParseResult;
};
export declare const markdownToHtmlTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        markdown: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        markdown: string;
    }, {
        markdown: string;
    }>;
    fn: ({ markdown }: {
        markdown: string;
    }) => {
        html: string;
    };
};
export declare const uuidTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    fn: () => {
        uuid: string;
    };
};
export declare const hashFnvTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => {
        hash: number;
        hex: string;
    };
};
export declare const regexTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        pattern: z.ZodString;
        input: z.ZodString;
        flags: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pattern: string;
        flags: string;
        input: string;
    }, {
        pattern: string;
        input: string;
        flags?: string | undefined;
    }>;
    fn: ({ pattern, input, flags }: {
        pattern: string;
        input: string;
        flags?: string;
    }) => import("./index.js").RegexTestResult;
};
export declare const jwtDecodeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
    fn: ({ token }: {
        token: string;
    }) => import("./index.js").JWTDecodeResult | {
        error: string;
    };
};
export declare const hexToHslTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        hex: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hex: string;
    }, {
        hex: string;
    }>;
    fn: ({ hex }: {
        hex: string;
    }) => import("./index.js").HslColor;
};
export declare const contrastRatioTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        hex1: z.ZodString;
        hex2: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hex1: string;
        hex2: string;
    }, {
        hex1: string;
        hex2: string;
    }>;
    fn: ({ hex1, hex2 }: {
        hex1: string;
        hex2: string;
    }) => import("./index.js").ContrastResult;
};
export declare const paletteTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        hex: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hex: string;
    }, {
        hex: string;
    }>;
    fn: ({ hex }: {
        hex: string;
    }) => import("./index.js").ColorPalette;
};
export declare const gradientTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["linear", "radial", "conic"]>>;
        direction: z.ZodOptional<z.ZodString>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            position?: string | undefined;
        }, {
            color: string;
            position?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial" | "conic";
        stops: {
            color: string;
            position?: string | undefined;
        }[];
        direction?: string | undefined;
    }, {
        stops: {
            color: string;
            position?: string | undefined;
        }[];
        type?: "linear" | "radial" | "conic" | undefined;
        direction?: string | undefined;
    }>;
    fn: ({ type, direction, stops }: {
        type: "linear" | "radial" | "conic";
        direction?: string;
        stops: Array<{
            color: string;
            position?: string;
        }>;
    }) => {
        gradient: string;
    };
};
export declare const urlParseTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
    fn: ({ url }: {
        url: string;
    }) => import("./index.js").ParsedUrl;
};
export declare const qrEncodeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        data: z.ZodString;
        errorCorrection: z.ZodDefault<z.ZodEnum<["L", "M", "Q", "H"]>>;
    }, "strip", z.ZodTypeAny, {
        data: string;
        errorCorrection: "L" | "M" | "Q" | "H";
    }, {
        data: string;
        errorCorrection?: "L" | "M" | "Q" | "H" | undefined;
    }>;
    fn: ({ data, errorCorrection }: {
        data: string;
        errorCorrection?: "L" | "M" | "Q" | "H";
    }) => import("./index.js").QrDataResult;
};
export declare const base64EncodeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
        urlSafe: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        input: string;
        urlSafe: boolean;
    }, {
        input: string;
        urlSafe?: boolean | undefined;
    }>;
    fn: ({ input, urlSafe }: {
        input: string;
        urlSafe?: boolean;
    }) => import("./index.js").Base64Result;
};
export declare const base64DecodeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => {
        output: string;
        valid: boolean;
        error?: string;
    };
};
export declare const slugifyTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
        separator: z.ZodDefault<z.ZodString>;
        maxLength: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        input: string;
        separator: string;
        maxLength?: number | undefined;
    }, {
        input: string;
        separator?: string | undefined;
        maxLength?: number | undefined;
    }>;
    fn: ({ input, separator, maxLength }: {
        input: string;
        separator?: string;
        maxLength?: number;
    }) => {
        slug: string;
    };
};
export declare const passwordStrengthTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
    }, {
        password: string;
    }>;
    fn: ({ password }: {
        password: string;
    }) => import("./index.js").PasswordStrengthResult;
};
export declare const generateSecretTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        length: z.ZodDefault<z.ZodNumber>;
        charset: z.ZodDefault<z.ZodEnum<["alphanumeric", "hex", "base64url", "numeric", "symbols"]>>;
    }, "strip", z.ZodTypeAny, {
        length: number;
        charset: "base64url" | "hex" | "alphanumeric" | "numeric" | "symbols";
    }, {
        length?: number | undefined;
        charset?: "base64url" | "hex" | "alphanumeric" | "numeric" | "symbols" | undefined;
    }>;
    fn: ({ length, charset }: {
        length?: number;
        charset?: "alphanumeric" | "hex" | "base64url" | "numeric" | "symbols";
    }) => import("./index.js").GeneratedSecret;
};
export declare const sanitizeHtmlTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => import("./index.js").SanitizeResult;
};
export declare const ALL_TOOLBOX_TOOLS: readonly [{
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        extension: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        extension: string;
    }, {
        extension: string;
    }>;
    fn: ({ extension }: {
        extension: string;
    }) => import("./index.js").VideoFormatInfo | {
        error: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        originalBytes: z.ZodNumber;
        targetFormat: z.ZodEnum<["jpeg", "webp", "avif", "png"]>;
        quality: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        quality: number;
        originalBytes: number;
        targetFormat: "jpeg" | "png" | "webp" | "avif";
    }, {
        originalBytes: number;
        targetFormat: "jpeg" | "png" | "webp" | "avif";
        quality?: number | undefined;
    }>;
    fn: ({ originalBytes, targetFormat, quality }: {
        originalBytes: number;
        targetFormat: "jpeg" | "webp" | "avif" | "png";
        quality?: number;
    }) => import("./index.js").ImageCompressEstimate;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        svg: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        svg: string;
    }, {
        svg: string;
    }>;
    fn: ({ svg }: {
        svg: string;
    }) => {
        optimized: string;
        originalLength: number;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => {
        seconds: number;
        formatted: string;
        valid: boolean;
    } | {
        seconds: null;
        formatted: null;
        valid: boolean;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        json: z.ZodString;
        indent: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        json: string;
        indent: number;
    }, {
        json: string;
        indent?: number | undefined;
    }>;
    fn: ({ json, indent }: {
        json: string;
        indent?: number;
    }) => string;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        csv: z.ZodString;
        delimiter: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        csv: string;
        delimiter: string;
    }, {
        csv: string;
        delimiter?: string | undefined;
    }>;
    fn: ({ csv, delimiter }: {
        csv: string;
        delimiter?: string;
    }) => import("./index.js").CSVParseResult;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        markdown: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        markdown: string;
    }, {
        markdown: string;
    }>;
    fn: ({ markdown }: {
        markdown: string;
    }) => {
        html: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    fn: () => {
        uuid: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => {
        hash: number;
        hex: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        pattern: z.ZodString;
        input: z.ZodString;
        flags: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pattern: string;
        flags: string;
        input: string;
    }, {
        pattern: string;
        input: string;
        flags?: string | undefined;
    }>;
    fn: ({ pattern, input, flags }: {
        pattern: string;
        input: string;
        flags?: string;
    }) => import("./index.js").RegexTestResult;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
    fn: ({ token }: {
        token: string;
    }) => import("./index.js").JWTDecodeResult | {
        error: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        hex: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hex: string;
    }, {
        hex: string;
    }>;
    fn: ({ hex }: {
        hex: string;
    }) => import("./index.js").HslColor;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        hex1: z.ZodString;
        hex2: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hex1: string;
        hex2: string;
    }, {
        hex1: string;
        hex2: string;
    }>;
    fn: ({ hex1, hex2 }: {
        hex1: string;
        hex2: string;
    }) => import("./index.js").ContrastResult;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        hex: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        hex: string;
    }, {
        hex: string;
    }>;
    fn: ({ hex }: {
        hex: string;
    }) => import("./index.js").ColorPalette;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["linear", "radial", "conic"]>>;
        direction: z.ZodOptional<z.ZodString>;
        stops: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            position: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            color: string;
            position?: string | undefined;
        }, {
            color: string;
            position?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "linear" | "radial" | "conic";
        stops: {
            color: string;
            position?: string | undefined;
        }[];
        direction?: string | undefined;
    }, {
        stops: {
            color: string;
            position?: string | undefined;
        }[];
        type?: "linear" | "radial" | "conic" | undefined;
        direction?: string | undefined;
    }>;
    fn: ({ type, direction, stops }: {
        type: "linear" | "radial" | "conic";
        direction?: string;
        stops: Array<{
            color: string;
            position?: string;
        }>;
    }) => {
        gradient: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        url: string;
    }, {
        url: string;
    }>;
    fn: ({ url }: {
        url: string;
    }) => import("./index.js").ParsedUrl;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        data: z.ZodString;
        errorCorrection: z.ZodDefault<z.ZodEnum<["L", "M", "Q", "H"]>>;
    }, "strip", z.ZodTypeAny, {
        data: string;
        errorCorrection: "L" | "M" | "Q" | "H";
    }, {
        data: string;
        errorCorrection?: "L" | "M" | "Q" | "H" | undefined;
    }>;
    fn: ({ data, errorCorrection }: {
        data: string;
        errorCorrection?: "L" | "M" | "Q" | "H";
    }) => import("./index.js").QrDataResult;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
        urlSafe: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        input: string;
        urlSafe: boolean;
    }, {
        input: string;
        urlSafe?: boolean | undefined;
    }>;
    fn: ({ input, urlSafe }: {
        input: string;
        urlSafe?: boolean;
    }) => import("./index.js").Base64Result;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => {
        output: string;
        valid: boolean;
        error?: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
        separator: z.ZodDefault<z.ZodString>;
        maxLength: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        input: string;
        separator: string;
        maxLength?: number | undefined;
    }, {
        input: string;
        separator?: string | undefined;
        maxLength?: number | undefined;
    }>;
    fn: ({ input, separator, maxLength }: {
        input: string;
        separator?: string;
        maxLength?: number;
    }) => {
        slug: string;
    };
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
    }, {
        password: string;
    }>;
    fn: ({ password }: {
        password: string;
    }) => import("./index.js").PasswordStrengthResult;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        length: z.ZodDefault<z.ZodNumber>;
        charset: z.ZodDefault<z.ZodEnum<["alphanumeric", "hex", "base64url", "numeric", "symbols"]>>;
    }, "strip", z.ZodTypeAny, {
        length: number;
        charset: "base64url" | "hex" | "alphanumeric" | "numeric" | "symbols";
    }, {
        length?: number | undefined;
        charset?: "base64url" | "hex" | "alphanumeric" | "numeric" | "symbols" | undefined;
    }>;
    fn: ({ length, charset }: {
        length?: number;
        charset?: "alphanumeric" | "hex" | "base64url" | "numeric" | "symbols";
    }) => import("./index.js").GeneratedSecret;
}, {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        input: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        input: string;
    }, {
        input: string;
    }>;
    fn: ({ input }: {
        input: string;
    }) => import("./index.js").SanitizeResult;
}];
