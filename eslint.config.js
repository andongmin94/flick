const path = require("path");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname, // __dirname은 CommonJS에서 기본 제공됨
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/jsx-key": "off",
    },
    ignores: ["components/ui/*", "hooks/*", "lib/*"],
  },
];

module.exports = config;
