import { config } from "@susisu/eslint-config";
import globals from "globals";

export default config(
  {
    tsconfigRootDir: import.meta.dirname,
  },
  {
    languageOptions: {
      globals: {
        ...globals.es2024,
        ...globals.node,
      },
    },
  },
  {
    rules: {
      "new-cap": "off",
    },
  },
  {
    ignores: ["sketch/**/*"],
  }
);
