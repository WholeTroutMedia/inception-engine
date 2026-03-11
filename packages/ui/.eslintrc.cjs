module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
    },
    rules: {
        'no-literal-css-values': 'error'
    }
};

// We manually register the plugin rule if the plugin isn't properly exported as an npm package
// but wait, standard ESLint requires plugins to be published or symlinked correctly.
// Let's use a simpler approach to load the local rule if needed, or assume the workspace resolves it.
