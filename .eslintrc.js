module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'standard'
  ],
  globals: {
    /*
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
   */
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
      destructuring: true
    }
  },
  rules: {
    "semi": ["error", "always"],
    "indent": ["error", 2],
    "curly": ["error", "all"],
    "eqeqeq": ["warn", "always"],
    "space-before-function-paren": ["warn", {
      "anonymous": "always",
      "named": "never",
      "asyncArrow": "always"
    }],
    "no-extra-semi": ["warn"]
  }
}
