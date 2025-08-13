import type { Cites, ElementSpec, SpecDefs } from '@markuplint/ml-spec';

declare namespace json {
	export { Attribute } from '@markuplint/ml-spec';
}

declare const json: {
	cites: Cites;
	def: SpecDefs;
	specs: ElementSpec[];
};

export = json;
