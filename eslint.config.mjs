import js from '@eslint/js';
import nextConfig from 'eslint-config-next';

export default [
  js.configs.recommended,
  ...nextConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
