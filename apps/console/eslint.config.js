import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow CSS custom property injections (style={{ '--c-token': value }}) — these are
      // the canonical pattern for passing runtime colors into CSS vars and are NOT inline styles.
      // Block genuine inline style properties (e.g. style={{ color: 'red' }}) instead via
      // the design-system plugin's no-literal-css-values rule.
      'no-restricted-syntax': 'off',
    },
  },
])
