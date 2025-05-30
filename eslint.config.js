import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'], // Apply to TypeScript files
    ignores: ['node_modules/', 'dist/', 'coverage/'], // Files to ignore
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      prettier: prettierPlugin,
    },
    rules: {
      // Add your custom rules here
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
