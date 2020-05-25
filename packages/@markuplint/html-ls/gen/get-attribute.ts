import { AttributeType } from '@markuplint/ml-spec';
import readJSON from './read-json';

export type AttributeSpecJSON = {
	name: string;
	type: AttributeType;
	required?: true;
	requiredEither?: string[];
	enum?: string[];
	noUse?: boolean;
	condition?: {
		ancestor?: string;
		self?: string | string[];
	};
};

export function getAttribute(tagName: string) {
	return readJSON(`../src/attributes/${tagName.toLowerCase()}.json`, {
		tag: tagName,
		attributes: [] as AttributeSpecJSON[],
	});
}
