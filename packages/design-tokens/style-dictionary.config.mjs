// style-dictionary.config.mjs
// Creative Liberation Engine Design System — Style Dictionary v4 build configuration
// Compiles W3C DTCG tokens into CSS, JS, and platform-specific outputs

const themes = ['light', 'dark'];

const configs = themes.map(theme => ({
    log: { verbosity: 'verbose' },
    // DTCG mode: parse $type / $value fields correctly
    usesDtcg: true,
    source: [
        // Primitives (authoritative base ramps — globals.json is canonical)
        'src/primitives/globals.json',
        'src/primitives/spacing.json',
        'src/primitives/typography.json',
        'src/primitives/motion.json',
        'src/primitives/radius-shadow.json',
        // Semantic layer (theme-specific)
        `src/semantic/${theme}.json`,
        'src/semantic/gradient.json',
        'src/semantic/motion.json',
        'src/semantic/radius-shadow.json',
        'src/semantic/spacing.json',
        'src/semantic/typography.json',
    ],
    platforms: {
        css: {
            transformGroup: 'css',
            prefix: 'inc',
            buildPath: 'dist/css/',
            files: [
                {
                    destination: `tokens.${theme}.css`,
                    format: 'css/variables',
                    options: {
                        outputReferences: true,
                        selector: theme === 'light' ? ':root' : '[data-theme="dark"]',
                    },
                },
                ...(theme === 'light' ? [
                    {
                        destination: 'tokens.primitives.css',
                        format: 'css/variables',
                        filter: (token) => token.filePath.includes('primitives'),
                        options: { outputReferences: false, selector: ':root' },
                    }
                ] : [])
            ],
        },
        ...(theme === 'light' ? {
            js: {
                transformGroup: 'js',
                buildPath: 'dist/js/',
                files: [{ destination: 'tokens.cjs', format: 'javascript/module-flat' }],
            },
            json: {
                transformGroup: 'css',
                buildPath: 'dist/json/',
                files: [{ destination: 'tokens.json', format: 'json/nested' }],
            },
        } : {})
    },
}));

export default configs;
