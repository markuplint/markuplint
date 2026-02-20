import type { DirectivePattern } from '../types/index.js';

type CompiledDirectivePattern = {
	readonly regex: RegExp;
	readonly pattern: DirectivePattern;
};

const cache = new WeakMap<readonly DirectivePattern[], readonly CompiledDirectivePattern[]>();

/**
 * Compiles directive patterns into RegExp objects, caching them
 * by the patterns array reference for efficiency.
 */
export function compileDirectivePatterns(patterns: readonly DirectivePattern[]): readonly CompiledDirectivePattern[] {
	let compiled = cache.get(patterns);
	if (!compiled) {
		compiled = patterns.map(p => ({
			regex: new RegExp(p.pattern, p.flags ?? 'i'),
			pattern: p,
		}));
		cache.set(patterns, compiled);
	}
	return compiled;
}

export type DirectiveResolution = {
	readonly potentialName?: string;
	readonly isDirective?: true;
	readonly isDynamicValue?: true;
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';
	readonly isDuplicatable?: boolean;
};

/**
 * Resolves an attribute name against a list of compiled directive patterns.
 * Returns the first match's resolution, or null if no pattern matches.
 */
export function resolveDirective(
	attrName: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	compiledPatterns: readonly CompiledDirectivePattern[],
): DirectiveResolution | null {
	for (const { regex, pattern } of compiledPatterns) {
		regex.lastIndex = 0;
		const match = regex.exec(attrName);
		if (!match) {
			continue;
		}

		let potentialName: string | undefined;
		if (pattern.potentialName != null) {
			potentialName = pattern.potentialName.replaceAll(/\$(\d+)/g, (_, idx: string) =>
				(match[Number(idx)] ?? '').toLowerCase(),
			);
		}

		let isDuplicatable: boolean | undefined;
		if (pattern.isDuplicatable === true) {
			isDuplicatable = true;
		} else if (Array.isArray(pattern.isDuplicatable) && potentialName) {
			isDuplicatable = (pattern.isDuplicatable as readonly string[]).includes(potentialName);
		}

		return {
			potentialName,
			isDirective: pattern.isDirective,
			isDynamicValue: pattern.isDynamicValue,
			valueType: pattern.valueType,
			isDuplicatable,
		};
	}
	return null;
}
