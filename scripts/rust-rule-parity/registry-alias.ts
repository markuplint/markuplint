import path from 'node:path';

/**
 * Points `@markuplint/rules` at its source in every vitest run (`vitest.config.ts` and the parity
 * configs). The testing API of `markuplint` runs a rule by its registered name, which it finds by the
 * identity of the object in the registry; the rule a spec imports (`./index.js`, the source) is that
 * object only when the registry is the source too, as the built `lib` is another module instance,
 * whose objects are not the spec's.
 */
export const RULES_REGISTRY_ALIAS = [
	{
		find: /^@markuplint\/rules$/,
		replacement: path.resolve(import.meta.dirname, '../../packages/@markuplint/rules/src/index.ts'),
	},
];
