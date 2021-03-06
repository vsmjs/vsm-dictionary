module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    mocha: true
  },
  extends: 'eslint:recommended',
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always', { 'omitLastInOneLineBlock': true }],
    'arrow-parens': ['error', 'as-needed'],
    'keyword-spacing': 'error',
  }
};
