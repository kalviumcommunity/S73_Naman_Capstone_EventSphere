import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // ESLint core does not treat a JSX reference as a use, so a component
      // passed in as a prop (`{ icon: Icon }`) reads as dead. This teaches it.
      'react/jsx-uses-vars': 'error',
    },
  },
  {
    // A context provider and its consumer hook belong in the same file. The
    // only cost is that editing one of these files does a full reload instead
    // of a hot swap, which is an acceptable trade for the colocation.
    files: ['src/context/*.jsx', 'src/components/ui/index.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
