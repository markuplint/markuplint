import type { FixToken, PlainData } from '@markuplint/ml-config';
import type { Attr, RuleConfigValue } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import { namespaceKeyOf } from '../helpers.js';

import meta from './meta.js';

type PredefinedGroup = 'global' | 'event' | 'aria' | 'role' | 'data' | 'spread';

type SortOrder = 'alphabetical' | 'source-order' | string[];

type OrderEntry =
	| string
	| {
			name?: string;
			pattern?: string;
			group?: PredefinedGroup;
			order?: SortOrder;
	  };

type Value = OrderEntry[];

type Options = {
	alphabetical?: boolean;
};

interface AttrToken {
	readonly spacesBeforeName: FixToken | null;
	readonly nameNode: FixToken | null;
	readonly spacesBeforeEqual: FixToken | null;
	readonly equal: FixToken | null;
	readonly spacesAfterEqual: FixToken | null;
	readonly startQuote: FixToken | null;
	readonly valueNode: FixToken | null;
	readonly endQuote: FixToken | null;
}

/**
 * What the order reads of an attribute: the name as written (`pattern`, messages), the name the DOM
 * gives it (`nameKey`: alphabetical order and the predefined groups, whose sets are of lower-case
 * names), and whether a name of the configuration is this attribute (`isNamedBy`).
 */
type NamedAttr = Pick<Attr<RuleConfigValue, PlainData>, 'name' | 'nameKey' | 'isNamedBy'> & {
	readonly ownerElement: { readonly elementType: string };
};

interface AttrInfo {
	readonly attr: NamedAttr;
	readonly name: string;
	readonly index: number;
	readonly isSpread: boolean;
	readonly spacing: string;
	readonly content: string;
	readonly tokens: AttrToken;
	readonly scopeNode: { readonly startLine: number; readonly startCol: number; readonly raw: string } | null;
}

function compareStrings(a: string, b: string): number {
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
}

function buildAttrContent(attr: AttrToken): string {
	const parts: (FixToken | null)[] = [
		attr.nameNode,
		attr.spacesBeforeEqual,
		attr.equal,
		attr.spacesAfterEqual,
		attr.startQuote,
		attr.valueNode,
		attr.endQuote,
	];
	return parts.map(p => p?.raw ?? '').join('');
}

function getAttrRange(attrs: readonly AttrInfo[]): readonly [number, number] | null {
	if (attrs.length === 0) {
		return null;
	}
	const first = attrs[0]!;
	const last = attrs.at(-1)!;

	const firstToken = first.tokens.spacesBeforeName ?? first.tokens.nameNode;
	const lastAttr = last.tokens;
	const lastTokens: (FixToken | null)[] = [
		lastAttr.endQuote,
		lastAttr.valueNode,
		lastAttr.startQuote,
		lastAttr.spacesAfterEqual,
		lastAttr.equal,
		lastAttr.spacesBeforeEqual,
		lastAttr.nameNode,
		lastAttr.spacesBeforeName,
	];
	const lastToken = lastTokens.find(t => t != null && t.raw.length > 0);

	if (!firstToken || !lastToken) {
		return null;
	}

	return [firstToken.startOffset, lastToken.startOffset + lastToken.raw.length];
}

interface CompiledEntry {
	readonly entryIndex: number;
	readonly order: SortOrder;
	readonly match: (attr: NamedAttr, isSpread: boolean) => boolean;
}

function compileEntries(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	entries: readonly OrderEntry[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	globalAttrs: ReadonlySet<string>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	eventAttrs: ReadonlySet<string>,
): CompiledEntry[] {
	return entries.map((entry, entryIndex) => {
		if (typeof entry === 'string') {
			return {
				entryIndex,
				order: 'alphabetical' as const,
				match: (attr: NamedAttr) => attr.isNamedBy(entry),
			};
		}

		const order = entry.order ?? 'alphabetical';

		if (entry.name != null) {
			const entryName = entry.name;
			return {
				entryIndex,
				order,
				match: (attr: NamedAttr) => attr.isNamedBy(entryName),
			};
		}

		if (entry.pattern != null) {
			let re: RegExp;
			try {
				re = new RegExp(entry.pattern);
			} catch {
				// Invalid regex pattern — skip this entry
				return {
					entryIndex,
					order,
					match: () => false,
				};
			}
			return {
				entryIndex,
				order,
				// The name as written: a pattern takes no flags, so it is not folded
				match: (attr: NamedAttr) => re.test(attr.name),
			};
		}

		if (entry.group != null) {
			const group = entry.group;
			const groupOrder = group === 'spread' && entry.order == null ? 'source-order' : order;
			switch (group) {
				case 'global': {
					return {
						entryIndex,
						order: groupOrder,
						match: (attr: NamedAttr) => globalAttrs.has(namespaceKeyOf(attr)),
					};
				}
				case 'event': {
					return {
						entryIndex,
						order: groupOrder,
						match: (attr: NamedAttr) => eventAttrs.has(namespaceKeyOf(attr)),
					};
				}
				case 'aria': {
					return {
						entryIndex,
						order: groupOrder,
						match: (attr: NamedAttr) => /^aria-.+$/.test(namespaceKeyOf(attr)),
					};
				}
				case 'role': {
					return {
						entryIndex,
						order: groupOrder,
						match: (attr: NamedAttr) => namespaceKeyOf(attr) === 'role',
					};
				}
				case 'data': {
					return {
						entryIndex,
						order: groupOrder,
						match: (attr: NamedAttr) => /^data-.+$/.test(namespaceKeyOf(attr)),
					};
				}
				case 'spread': {
					return {
						entryIndex,
						order: groupOrder,
						match: (_attr: NamedAttr, isSpread: boolean) => isSpread,
					};
				}
			}
		}

		return {
			entryIndex,
			order,
			match: () => false,
		};
	});
}

function matchEntry(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	compiledEntries: readonly CompiledEntry[],
	attr: NamedAttr,
	isSpread: boolean,
	fallbackIndex: number,
): { entryIndex: number; order: SortOrder } {
	for (const entry of compiledEntries) {
		if (entry.match(attr, isSpread)) {
			return { entryIndex: entry.entryIndex, order: entry.order };
		}
	}
	return { entryIndex: fallbackIndex, order: 'alphabetical' };
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function compareWithinGroup(a: AttrInfo, b: AttrInfo, order: SortOrder): number {
	if (order === 'alphabetical') {
		return compareStrings(a.attr.nameKey, b.attr.nameKey);
	}
	if (order === 'source-order') {
		return a.index - b.index;
	}
	if (Array.isArray(order)) {
		const ai = order.findIndex(name => a.attr.isNamedBy(name));
		const bi = order.findIndex(name => b.attr.isNamedBy(name));
		const aIdx = ai === -1 ? order.length : ai;
		const bIdx = bi === -1 ? order.length : bi;
		if (aIdx !== bIdx) {
			return aIdx - bIdx;
		}
		if (ai === -1 && bi === -1) {
			return compareStrings(a.attr.nameKey, b.attr.nameKey);
		}
		return 0;
	}
	return 0;
}

function sortAttrs(
	attrInfos: readonly AttrInfo[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	compiledEntries: readonly CompiledEntry[],
	alphabetical: boolean,
): AttrInfo[] {
	const fallbackIndex = compiledEntries.length;

	const tagged = attrInfos.map(info => {
		const { entryIndex, order } = matchEntry(compiledEntries, info.attr, info.isSpread, fallbackIndex);
		return { info, entryIndex, order };
	});

	return tagged
		.toSorted((a, b) => {
			if (a.entryIndex !== b.entryIndex) {
				return a.entryIndex - b.entryIndex;
			}
			const isFallback = a.entryIndex === fallbackIndex;
			if (isFallback) {
				return alphabetical
					? compareStrings(a.info.attr.nameKey, b.info.attr.nameKey)
					: a.info.index - b.info.index;
			}
			return compareWithinGroup(a.info, b.info, a.order);
		})
		.map(t => t.info);
}

export default createRule<Value, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultValue: [],
	defaultOptions: {
		alphabetical: true,
	},
	async verify({ document, report, t }) {
		const globalAttrs = new Set<string>();
		const eventAttrs = new Set<string>();

		const defs = document.specs.def?.['#globalAttrs'];
		if (defs != null) {
			const htmlGlobal = defs['#HTMLGlobalAttrs'];
			if (htmlGlobal) {
				for (const name of Object.keys(htmlGlobal)) {
					globalAttrs.add(name);
				}
			}
			const eventGlobal = defs['#GlobalEventAttrs'];
			if (eventGlobal) {
				for (const name of Object.keys(eventGlobal)) {
					eventAttrs.add(name);
				}
			}
		}

		let cachedValue: readonly OrderEntry[] | undefined;
		let cachedCompiled: CompiledEntry[] | undefined;

		await document.walkOn('Element', node => {
			const attrs = node.getAttributeTokens();
			if (attrs.length <= 1) {
				return;
			}

			const value = node.rule.value;
			const options = node.rule.options;
			const alphabetical = options.alphabetical ?? true;
			const ms = node.rule.severity === 'error' ? 'must' : 'should';

			const entries: readonly OrderEntry[] = value.length > 0 ? value : [];
			const isAlphabeticalOnly = entries.length === 0;

			let compiledEntries: CompiledEntry[];
			if (cachedValue === value) {
				compiledEntries = cachedCompiled!;
			} else {
				compiledEntries = compileEntries(entries, globalAttrs, eventAttrs);
				cachedValue = value;
				cachedCompiled = compiledEntries;
			}

			const attrInfos: AttrInfo[] = attrs.map((attr, i) => {
				const nameNode = attr.nameNode;
				return {
					attr,
					name: attr.name,
					index: i,
					isSpread: nameNode == null,
					spacing: attr.spacesBeforeName?.raw ?? '',
					content: buildAttrContent(attr),
					tokens: attr,
					scopeNode: nameNode ?? attr.spacesBeforeName,
				};
			});

			const sorted = isAlphabeticalOnly
				? alphabetical
					? [...attrInfos].toSorted((a, b) => compareStrings(a.attr.nameKey, b.attr.nameKey))
					: attrInfos
				: sortAttrs(attrInfos, compiledEntries, alphabetical);

			// Find first violation
			for (let i = 0; i < attrInfos.length; i++) {
				if (attrInfos[i] !== sorted[i]) {
					const actual = attrInfos[i]!;
					const expected = sorted[i]!;
					const scope = expected.scopeNode;
					if (!scope) {
						continue;
					}

					report({
						scope: {
							rule: node.rule,
							startLine: scope.startLine,
							startCol: scope.startCol,
							raw: scope.raw,
						},
						message: t(
							`{0} ${ms} be before {1}`,
							`"${expected.name || '(spread)'}"`,
							`"${actual.name || '(spread)'}"`,
						),
						fix: fixer => {
							const range = getAttrRange(attrInfos);
							if (!range) {
								return [];
							}
							const newText = sorted
								.map((info, j) => {
									const spacing = attrInfos[j]!.spacing;
									return spacing + info.content;
								})
								.join('');
							return fixer.replaceRange(range, newText);
						},
					});
					break;
				}
			}
		});
	},
});
