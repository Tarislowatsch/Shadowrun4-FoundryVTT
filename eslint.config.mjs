import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules',
      'dist',
      'packs',
      'shadowrun4e',

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
        CONST: 'readonly',
        game: 'readonly',
        Hooks: 'readonly',
        Roll: 'readonly',
        ui: 'readonly',

        Item: 'readonly',
        Folder: 'readonly',
        Token: 'readonly',
        ChatMessage: 'readonly',
        Combat: 'readonly',
        Combatant: 'readonly',
        ActiveEffect: 'readonly',
        TextEditor: 'readonly',
        FilePicker: 'readonly',

        Dialog: 'readonly',

        FormApplication: 'readonly',
        Handlebars: 'readonly',

        canvas: 'readonly',
        foundry: 'readonly',

        fromUuid: 'readonly',
        loadTemplates: 'readonly',

        shadowrun4e: 'readonly',
        sr4: 'readonly',
      },
      sourceType: 'module',
    },

    rules: {
      eqeqeq: 'error',

      'no-console': 'off',
      'no-unused-expressions': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
