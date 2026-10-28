import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
      react: {
        version: "19.2",
      },
    },
  },
  prettier,
  globalIgnores([
    "**/.next/**",
    "**/.nuxt/**",
    "**/.output/**",
    "**/.pytest_cache/",
    "**/dist/**",
    "**/node_modules/**",
    "coverage/**",
    "apps/web/next-env.d.ts",
  ]),
]);
