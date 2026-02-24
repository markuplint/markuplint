import type { FixToken } from '@markuplint/ml-config';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

type PredefinedGroup = 'global' | 'event' | 'aria' | 'data' | 'spread';

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

interface AttrInfo {
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
	readonly match: (name: string, isSpread: boolean) => boolean;
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
				match: (name: string) => name === entry,
			};
		}

		const order = entry.order ?? 'alphabetical';

		if (entry.name != null) {
			return {
				entryIndex,
				order,
				match: (name: string) => name === entry.name,
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
				match: (name: string) => re.test(name),
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
						match: (name: string) => globalAttrs.has(name),
					};
				}
				case 'event': {
					return {
						entryIndex,
						order: groupOrder,
						match: (name: string) => eventAttrs.has(name),
					};
				}
				case 'aria': {
					return {
						entryIndex,
						order: groupOrder,
						match: (name: string) => /^aria-.+$/.test(name),
					};
				}
				case 'data': {
					return {
						entryIndex,
						order: groupOrder,
						match: (name: string) => /^data-.+$/.test(name),
					};
				}
				case 'spread': {
					return {
						entryIndex,
						order: groupOrder,
						match: (_name: string, isSpread: boolean) => isSpread,
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
	name: string,
	isSpread: boolean,
	fallbackIndex: number,
): { entryIndex: number; order: SortOrder } {
	for (const entry of compiledEntries) {
		if (entry.match(name, isSpread)) {
			return { entryIndex: entry.entryIndex, order: entry.order };
		}
	}
	return { entryIndex: fallbackIndex, order: 'alphabetical' };
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function compareWithinGroup(a: AttrInfo, b: AttrInfo, order: SortOrder): number {
	if (order === 'alphabetical') {
		return compareStrings(a.name, b.name);
	}
	if (order === 'source-order') {
		return a.index - b.index;
	}
	if (Array.isArray(order)) {
		const ai = order.indexOf(a.name);
		const bi = order.indexOf(b.name);
		const aIdx = ai === -1 ? order.length : ai;
		const bIdx = bi === -1 ? order.length : bi;
		if (aIdx !== bIdx) {
			return aIdx - bIdx;
		}
		if (ai === -1 && bi === -1) {
			return compareStrings(a.name, b.name);
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
		const { entryIndex, order } = matchEntry(compiledEntries, info.name, info.isSpread, fallbackIndex);
		return { info, entryIndex, order };
	});

	return tagged
		.toSorted((a, b) => {
			if (a.entryIndex !== b.entryIndex) {
				return a.entryIndex - b.entryIndex;
			}
			const isFallback = a.entryIndex === fallbackIndex;
			if (isFallback) {
				return alphabetical ? compareStrings(a.info.name, b.info.name) : a.info.index - b.info.index;
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
					? [...attrInfos].toSorted((a, b) => compareStrings(a.name, b.name))
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
