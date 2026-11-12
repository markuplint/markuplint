import path from 'node:path';

/**
 * Points `@markuplint/rules` at its source for the parity runs. The rule a spec imports
 * (`./index.js`, the source) is then the object of the registry that the testing API of
 * `markuplint` looks up to run a built-in rule by its registered name; the built `lib` would be
 * another module instance, whose objects are not the spec's.
 */
export const RULES_REGISTRY_ALIAS = [
	{
		find: /^@markuplint\/rules$/,
		replacement: path.resolve('packages/@markuplint/rules/src/index.ts'),
	},
];
