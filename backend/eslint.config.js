const js = require("@eslint/js");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "uploads/**",
      "logs/**",
    ],
  },
  js.configs.recommended,
];