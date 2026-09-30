import js from '@eslint/js';
import globals from 'globals';

// code quality rules for the Code Quality stage.
// strict on purpose: lint:ci uses --max-warnings 0 so even one warning fails the build
const qualityRules = {
  complexity:               ['warn', { max: 10 }],
  'max-depth':              ['warn', 3],
  'max-params':             ['warn', 4],
  'max-nested-callbacks':   ['warn', 3],
  'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
  'max-lines':              ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
  'no-unused-vars':         ['warn', { argsIgnorePattern: '^_' }],
  'no-var':                 'error',
  'prefer-const':           'warn',
  eqeqeq:                   ['error', 'always'],
  'no-eval':                'error',
  'no-implied-eval':        'error',
  'consistent-return':      'warn',
};

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'reports/**', 'public/js/bundle.js'],
  },
  js.configs.recommended,
  {
    files: ['server/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: qualityRules,
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      'max-lines-per-function': 'off',   // describe() blocks are naturally long
      'max-nested-callbacks': ['warn', 5],
    },
  },

  {
    // frontend files are plain <script> tags that share globals with each other
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        API: 'writable', initLogin: 'writable', initDashboard: 'writable',
        loadPatient: 'writable', selectRole: 'writable', showScreen: 'writable',
        scanTransition: 'writable', toggleAudit: 'writable', closeAudit: 'writable',
        startAuditPoll: 'writable', stopAuditPoll: 'writable', _currentUser: 'writable',
      },
    },
    rules: {
      ...qualityRules,
      'no-unused-vars': 'off',        // functions are referenced across <script> files
      'no-redeclare': 'off',
      'max-lines-per-function': 'off', // HTML template builders are long but flat
    },
  },
];
