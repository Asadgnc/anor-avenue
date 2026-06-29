import { defineConfig } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next/dist/index.js";
import tsParser from "@typescript-eslint/parser";

const eslintConfig = defineConfig([
  {
    plugins: { "@next/next": nextPlugin },
    languageOptions: { parser: tsParser },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
]);

export default eslintConfig;
