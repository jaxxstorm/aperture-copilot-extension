import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
	files: ["src/**/*.ts", "test/**/*.ts"],
	plugins: {
		"@stylistic": stylistic,
	},
	rules: {
		"@stylistic/semi": ["error", "always"],
		"@stylistic/indent": ["error", "tab"],
		"@stylistic/quotes": ["error", "double"],
		curly: ["error", "all"],
		"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
	},
});
