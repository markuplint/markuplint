/**
 * Build-time expansion of named selector aliases used in attribute
 * `condition` fields of the per-element spec sources.
 *
 * Aliases keep selector fragments that are repeated across many conditions
 * (e.g. the classic-script detection on the script element, which enumerates
 * the 16 JavaScript MIME type essence strings) in a single source of truth,
 * while the generated index.json stays plain CSS so that any consumer can
 * evaluate it without markuplint-specific selector extensions.
 *
 * An alias token is `#` followed by an UpperCamelCase name (e.g.
 * `#ClassicScript`), mirroring the `#HTMLGlobalAttrs`-style references used
 * by `globalAttrs`. Lowercase ID selectors (e.g. `#someId`) are never
 * treated as aliases.
 */

/**
 * Matches alias tokens. Aliases are required to start with an uppercase
 * letter so that ordinary (lowercase) ID selectors cannot collide.
 */
const TOKEN_PATTERN = /#[A-Z][\dA-Za-z]*/g;

/**
 * Replaces every alias token in a selector string using the given resolved
 * definitions.
 *
 * @param selector - The selector string that may contain alias tokens
 * @param aliases - Fully resolved alias definitions
 * @returns The selector with every token replaced
 * @throws If the selector references an alias that is not defined
 */
function expandTokens(selector: string, aliases: Readonly<Record<string, string>>): string {
	return selector.replaceAll(TOKEN_PATTERN, token => {
		const replacement = aliases[token];
		if (replacement == null) {
			throw new Error(`Unknown selector alias: ${token}`);
		}
		return replacement;
	});
}

/**
 * Resolves nested references between alias definitions so that every
 * definition becomes a plain selector string.
 *
 * @param definitions - Raw alias definitions; values may reference other aliases
 * @returns Definitions with every nested reference expanded
 * @throws If a definition references an unknown alias or forms a cycle
 */
export function resolveAliases(definitions: Readonly<Record<string, string>>): Record<string, string> {
	const resolved: Record<string, string> = {};
	const resolving = new Set<string>();

	function resolve(name: string): string {
		const cached = resolved[name];
		if (cached != null) {
			return cached;
		}
		const raw = definitions[name];
		if (raw == null) {
			throw new Error(`Unknown selector alias: ${name}`);
		}
		if (resolving.has(name)) {
			throw new Error(`Circular selector alias: ${name}`);
		}
		resolving.add(name);
		const value = raw.replaceAll(TOKEN_PATTERN, token => resolve(token));
		resolving.delete(name);
		resolved[name] = value;
		return value;
	}

	for (const name of Object.keys(definitions)) {
		resolve(name);
	}

	return resolved;
}

/**
 * Expands alias tokens in every selector-bearing `condition` field of an
 * element's attribute definitions: plain string conditions, array
 * conditions, and conditions inside `ConditionalAttributeType` entries.
 * Attributes without aliases are returned unchanged.
 *
 * @param attributes - The element's attribute definitions from the spec source
 * @param aliases - Fully resolved alias definitions (see {@link resolveAliases})
 * @returns The attribute definitions with every condition expanded
 * @throws If a condition references an alias that is not defined
 */
export function expandConditionAliases<T extends Record<string, any>>(
	attributes: Readonly<T>,
	aliases: Readonly<Record<string, string>>,
): T {
	const result: Record<string, any> = {};

	for (const [name, attr] of Object.entries(attributes)) {
		if (attr == null || typeof attr !== 'object') {
			result[name] = attr;
			continue;
		}

		const expanded = { ...attr };

		if (typeof expanded.condition === 'string') {
			expanded.condition = expandTokens(expanded.condition, aliases);
		} else if (Array.isArray(expanded.condition)) {
			expanded.condition = expanded.condition.map((selector: string) => expandTokens(selector, aliases));
		}

		if (Array.isArray(expanded.type)) {
			expanded.type = expanded.type.map((entry: any) => {
				if (entry == null || typeof entry !== 'object' || typeof entry.condition !== 'string') {
					return entry;
				}
				return {
					...entry,
					condition: expandTokens(entry.condition, aliases),
				};
			});
		}

		result[name] = expanded;
	}

	return result as T;
}
