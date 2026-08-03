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
        {
          selector:
            "CallExpression[callee.property.name=/Flag$/][arguments.0.type='Literal'][arguments.0.value!=/^(shadowrun4e|core|world)$/]",
          message:
            'The flag API validates its scope, so only "shadowrun4e", "core" and "world" reach a document. Use SYSTEM_ID from @utils/game/system-id.js.',
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(get|unset)Flag$/][arguments.length<2]",
          message:
            'getFlag/unsetFlag take a scope and a key. A keyless call silently yields undefined; read flags[SYSTEM_ID] directly when you want the whole scope.',
        },
        {
          selector:
            "CallExpression[callee.property.name='setFlag'][arguments.length<3]",
          message:
            'setFlag takes a scope, a key and a value. Pass the complete value, so the write is correct whether Foundry merges it or replaces it.',
        },
        {
          selector:
            "MemberExpression[object.property.name='flags'][property.name='sr4']",
          message:
            'The "sr4" flag scope is gone. Use flags[SYSTEM_ID] from @utils/game/system-id.js.',
        },
        {
          selector: 'Literal[value=/^flags\\.sr4($|\\.)/]',
          message:
            'The "sr4" flag scope is gone. Build the path from SYSTEM_ID in @utils/game/system-id.js.',
        },
        {
          selector: 'TemplateElement[value.raw=/^flags\\.sr4\\./]',
          message:
            'The "sr4" flag scope is gone. Build the path from SYSTEM_ID in @utils/game/system-id.js.',
        },
        {
          selector:
            "Property:matches([key.name='sr4'], [key.value='sr4']):not([value.type='Literal'])",
          message:
            'The "sr4" flag scope is gone. Key the object with [SYSTEM_ID] from @utils/game/system-id.js.',
        },
      ],
    },
  },

  {
    // Each of these owns the very thing the rules above forbid elsewhere:
    // dialog-v2 wraps DialogV2, system-socket wraps the socket event, and
    // flag-namespace holds the legacy scope the migration needs to read.
    files: [
      'src/utils/dialog/dialog-v2.js',
      'src/utils/game/system-socket.js',
      'src/effects/flag-namespace.js',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
