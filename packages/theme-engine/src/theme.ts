import { tokens } from './tokens.js';

export const createTheme = (customTokens: Partial<typeof tokens> = {}) => {
    return {
        ...tokens,
        ...customTokens,
        // Deep merge could be implemented here for more advanced usage
    };
};

export const defaultTheme = createTheme();
