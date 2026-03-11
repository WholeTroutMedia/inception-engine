import { tokens } from './tokens.js';
export declare const createTheme: (customTokens?: Partial<typeof tokens>) => {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    typography: {
        fonts: {
            sans: string;
            mono: string;
        };
        sizes: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
            '2xl': string;
            '3xl': string;
            '4xl': string;
            '5xl': string;
        };
    };
};
export declare const defaultTheme: {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    typography: {
        fonts: {
            sans: string;
            mono: string;
        };
        sizes: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
            '2xl': string;
            '3xl': string;
            '4xl': string;
            '5xl': string;
        };
    };
};
//# sourceMappingURL=theme.d.ts.map