import type { DirectivePattern } from '../types/index.js';
import type { ExpressionLanguage } from '@markuplint/ml-ast';

import { camelize } from '@markuplint/shared';

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
	/**
	 * Whether the value is written as code (a binding). Whether its value is known is up to `MLAttr`.
	 */
	readonly isDynamicValue?: true;
	/**
	 * Present only when the matched pattern declares it.
	 */
	readonly expressionLanguage?: ExpressionLanguage;
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';
	readonly isDuplicatable?: boolean;
	/**
	 * Present only when the matched pattern decides it ({@link DirectivePattern.duplicateKey}): the key
	 * under which the directive counts as written twice, or `null` when it never does (a pattern that is
	 * `isDuplicatable: true` and declares no key). Absent, the key is the name as it is written.
	 */
	readonly duplicateKey?: string | null;
	/**
	 * Present only when the key is the name of an attribute that the element folds
	 * ({@link DirectivePattern.duplicateKeyModifiers}'s `foldedWithoutPrefix`) and no prefix is in front of it.
	 */
	readonly duplicateKeyFolds?: true;
};

type DuplicateKey = {
	/**
	 * `null` when the pattern never counts a repeat, `undefined` when it says nothing of the key.
	 */
	readonly key: string | null | undefined;
	readonly folds: boolean;
};

/**
 * The key of an attribute that a pattern gives, as {@link DirectivePattern.duplicateKey} says.
 */
function resolveDuplicateKey(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	pattern: DirectivePattern,
	match: RegExpExecArray,
): DuplicateKey {
	if (pattern.duplicateKey == null) {
		return { key: pattern.isDuplicatable === true ? null : undefined, folds: false };
	}
	const modifiers = pattern.duplicateKeyModifiers;
	const written = new Set((modifiers ? (match[modifiers.group] ?? '') : '').split('.').filter(Boolean));
	// Only what the directive writes is camelized (`transformBind` of Vue does so to the argument), not the
	// text that the template puts around it
	const camelized = modifiers?.camelize?.some(modifier => written.has(modifier)) === true;
	const key = pattern.duplicateKey.replaceAll(/\$(\d+)/g, (_, idx: string) => {
		const capture = match[Number(idx)] ?? '';
		return camelized ? camelize(capture) : capture;
	});
	if (!modifiers) {
		return { key, folds: false };
	}
	const prefix = (modifiers.prefixes ?? [])
		.filter(({ modifier }) => written.has(modifier))
		.map(({ prefix }) => prefix)
		.join('');
	return { key: prefix + key, folds: modifiers.foldedWithoutPrefix === true && prefix === '' };
}

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
			potentialName = pattern.potentialName.replaceAll(/\$(\d+)/g, (_, idx: string) => match[Number(idx)] ?? '');
		}

		let isDuplicatable: boolean | undefined;
		if (pattern.isDuplicatable === true) {
			isDuplicatable = true;
		} else if (Array.isArray(pattern.isDuplicatable) && potentialName) {
			isDuplicatable = (pattern.isDuplicatable as readonly string[]).includes(potentialName);
		}

		const duplicateKey = resolveDuplicateKey(pattern, match);

		return {
			potentialName,
			isDirective: pattern.isDirective,
			isDynamicValue: pattern.isDynamicValue,
			valueType: pattern.valueType,
			isDuplicatable,
			...(pattern.expressionLanguage ? { expressionLanguage: pattern.expressionLanguage } : {}),
			...(duplicateKey.key === undefined ? {} : { duplicateKey: duplicateKey.key }),
			...(duplicateKey.folds ? { duplicateKeyFolds: true as const } : {}),
		};
	}
	return null;
}
