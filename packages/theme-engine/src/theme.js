import { tokens } from './tokens.js';
export const createTheme = (customTokens = {}) => {
    return {
        ...tokens,
        ...customTokens,
        // Deep merge could be implemented here for more advanced usage
    };
};
export const defaultTheme = createTheme();
//# sourceMappingURL=theme.js.map