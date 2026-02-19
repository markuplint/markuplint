import type { RuleSeed } from './types.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

/**
 * Factory function for creating a type-safe rule seed.
 * Returns the seed object as-is; primarily used for type inference.
 *
 * When `T` is `boolean` (or includes `boolean`), `defaultValue` is optional because
 * the runtime default is `true`. For all other value types, `defaultValue` is required
 * so that the rule always has a well-typed default.
 *
 * @see https://github.com/markuplint/markuplint/issues/808
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @param seed - The rule seed definition containing verify/fix functions and defaults
 * @returns The same seed object, now fully typed
 */
export function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(
	seed: Readonly<RuleSeed<T, O>> & (boolean extends T ? {} : { readonly defaultValue: T }),
): Readonly<RuleSeed<T, O>>;
export function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(seed: Readonly<RuleSeed<T, O>>) {
	return seed;
}
