import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules',
      'dist',
      'packs',

      // nur Typdefinitionen ignorieren
      'foundry/**/*.d.mts',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.mjs'],

    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        Actor: 'readonly',
        Application: 'readonly',
        ...globals.browser,
        ...globals.node,

        CONFIG: 'readonly',
        game: 'readonly',
        Hooks: 'readonly',
        Roll: 'readonly',
        ui: 'readonly',

        Item: 'readonly',
        Token: 'readonly',
        ChatMessage: 'readonly',

        Dialog: 'readonly',

        FormApplication: 'readonly',

        canvas: 'readonly',
        foundry: 'readonly',

        fromUuid: 'readonly',
        loadTemplates: 'readonly',

        shadowrun4e: 'readonly',
      },
      sourceType: 'module',
    },

    rules: {
      eqeqeq: 'error',

      'no-console': 'off',
      'no-unused-expressions': 'off',
      'no-unused-vars': 'warn',
    },
  },
];
