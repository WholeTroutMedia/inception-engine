// diag-full.mjs — Full build test for light + dark themes
import StyleDictionary from 'style-dictionary';

const themes = ['light', 'dark'];

for (const theme of themes) {
    console.log(`\n--- Building ${theme} theme ---`);
    const sd = new StyleDictionary({
        usesDtcg: true,
        log: { verbosity: 'verbose' },
        source: [
            'src/primitives/globals.json',
            'src/primitives/spacing.json',
            'src/primitives/typography.json',
            'src/primitives/motion.json',
            'src/primitives/radius-shadow.json',
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
                    ...(theme === 'light' ? [{
                        destination: 'tokens.primitives.css',
                        format: 'css/variables',
                        filter: (token) => token.filePath.includes('primitives'),
                        options: { outputReferences: false, selector: ':root' },
                    }] : []),
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
            } : {}),
        },
    });

    try {
        await sd.buildAllPlatforms();
    } catch (e) {
        console.error(`Failed (${theme}):`, e.message);
    }
}

console.log('\nDone. Checking dist/css/:');
import { readdirSync } from 'fs';
try {
    console.log(readdirSync('dist/css'));
} catch (e) {
    console.log('dist/css does not exist yet');
}
