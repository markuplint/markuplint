import importX from 'eslint-plugin-import-x';

/**
 * @type {import('eslint').Linter.Config}
 */
export const ts = {
	...importX.flatConfigs.typescript,
	languageOptions: {
		parserOptions: {
			sourceType: 'module',
			project: ['./tsconfig.json', './tsconfig.test.json'],
		},
	},
	rules: {
		...importX.flatConfigs.typescript.rules,
		'@typescript-eslint/no-unused-vars': [2, { args: 'none' }],
		'@typescript-eslint/no-array-constructor': 2,
		'@typescript-eslint/adjacent-overload-signatures': 2,
		'@typescript-eslint/no-namespace': [2, { allowDeclarations: true }],
		'@typescript-eslint/prefer-namespace-keyword': 2,
		'@typescript-eslint/no-var-requires': 2,
		'@typescript-eslint/no-unnecessary-type-assertion': 2,
		'@typescript-eslint/restrict-plus-operands': 0,
		'@typescript-eslint/consistent-type-imports': 1,
		'@typescript-eslint/require-await': 'error',
		'@typescript-eslint/no-floating-promises': 'error',
		'@typescript-eslint/strict-boolean-expressions': [
			'error',
			{
				allowString: true,
				allowNumber: false,
				allowNullableObject: true,
				allowNullableEnum: false,
				allowNullableString: true,
				allowNullableBoolean: true,
				allowAny: true,
			},
		],
		'@typescript-eslint/prefer-readonly-parameter-types': [
			'warn',
			{
				checkParameterProperties: false,
				ignoreInferredTypes: true,
				treatMethodsAsReadonly: false,
			},
		],

		// Temporary disabled
		'@typescript-eslint/ban-ts-comment': 0,
		'@typescript-eslint/no-empty-object-type': 0,
		'@typescript-eslint/no-explicit-any': 0,
		'@typescript-eslint/no-unnecessary-type-constraint': 0,
	},
};
