/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  printWidth: 88,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./app/globals.css",
};

export default config;
