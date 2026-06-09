/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
  trailingComma: "all",
  printWidth: 88,
  arrowParens: "always",
  bracketSameLine: false,
  quoteProps: "as-needed",

  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./app/globals.css",
  tailwindFunctions: ["cn", "cva", "clsx"],

  overrides: [
    {
      files: ["*.md", "*.mdx"],
      options: {
        proseWrap: "preserve",
      },
    },
  ],
};

export default config;
