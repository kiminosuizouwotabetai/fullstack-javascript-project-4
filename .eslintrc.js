module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: 'airbnb-base',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  rules: {
    'no-console': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
  },
};
