import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // ~380 pre-existing `any`s are spread across the API routes and table
      // components. They are real technical debt and should be typed out over
      // time, but as errors they drown the handful of findings that actually
      // break the build, so `npm run lint` stopped being usable as a gate.
      // Demoted to a warning: still reported, no longer masking real errors.
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow intentionally unused bindings when prefixed with `_`, which is
      // the usual escape hatch for unused catch bindings and placeholder args.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
