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
        fromUuidSync: 'readonly',
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

      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.property.name='DialogV2'][callee.property.name=/^(prompt|wait|confirm)$/]",
          message:
            'Use promptDialog/waitDialog/confirmDialog from @utils/dialog so dismissing a dialog resolves to null instead of rejecting.',
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(emit|on|off)$/][arguments.0.value='system.shadowrun4e']",
          message:
            'Use emitSystemSocket/onSystemSocket/offSystemSocket from @utils/game so the emitting client receives the message too.',
        },
      ],
    },
  },

  {
    files: ['src/utils/dialog/dialog-v2.js', 'src/utils/game/system-socket.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
