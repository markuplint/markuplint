import type { Attribute as MLAttribute, Cites, ElementSpec, SpecDefs } from '@markuplint/ml-spec';

declare namespace json {
	/**
	 * Declared as an alias instead of `export { Attribute } from '@markuplint/ml-spec'`:
	 * an export declaration inside a namespace is TS1194, which oxfmt's parser rejects
	 * (`oxfmt --check` exits 2) even though tsc tolerates it in ambient context.
	 */
	type Attribute = MLAttribute;
}

declare const json: {
	/**
	 * `@markuplint/html-spec` writes no `cites` (see `MLMLSpec.cites` of `@markuplint/ml-spec`).
	 *
	 * @deprecated Delete it; there is no replacement. Removed in v6.
	 */
	cites?: Cites;
	def: SpecDefs;
	specs: ElementSpec[];
};

export = json;
