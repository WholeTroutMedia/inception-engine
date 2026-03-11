// packages/design-agent/src/eslint/index.cjs
// ESLint plugin entry point — @inception/design-agent/eslint

'use strict';

const noLiteralCssValues = require('./no-literal-css-values.cjs');

/** @type {import('eslint').ESLint.Plugin} */
module.exports = {
    meta: {
        name: '@inception/design-agent',
        version: '1.0.0',
    },
    rules: {
        'no-literal-css-values': noLiteralCssValues,
    },
    configs: {
        recommended: {
            plugins: ['@inception/design-agent'],
            rules: {
                '@inception/design-agent/no-literal-css-values': 'error',
            },
        },
    },
};
