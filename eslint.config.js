import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Fichiers à ignorer globalement
  {
    ignores: [
      'node_modules/**',
      'migrations/**',
      'labo/**',
      'scripts/runMigration.js',
      'scripts/extractAds.js',
      '.git/**',
    ],
  },

  // Configuration de base ESLint
  js.configs.recommended,

  // Configuration Prettier (désactive les règles conflictuelles)
  prettierConfig,

  {
    // Fichiers à linter
    files: ['**/*.js'],

    // Plugins
    plugins: {
      prettier,
    },

    // Configuration de l'environnement
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },

    // Règles personnalisées (basées sur le style existant du projet)
    rules: {
      // Prettier comme erreur
      'prettier/prettier': 'error',

      // Style de code (harmonisé avec le code existant)
      // indent géré par Prettier
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      semi: ['error', 'always'],
      'comma-dangle': [
        'error',
        {
          arrays: 'only-multiline',
          objects: 'only-multiline',
          imports: 'only-multiline',
          exports: 'only-multiline',
          functions: 'never',
        },
      ],

      // Espaces et formatage
      'arrow-spacing': ['error', { before: true, after: true }],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'never',
          named: 'never',
          asyncArrow: 'always',
        },
      ],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'keyword-spacing': ['error', { before: true, after: true }],
      'space-infix-ops': 'error',
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],

      // Bonnes pratiques JavaScript
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // On utilise console pour les logs
      'require-await': 'error',
      'no-return-await': 'error',

      // Sécurité et qualité
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // ES6+
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-template': 'error',
      'template-curly-spacing': ['error', 'never'],
    },
  },
];
