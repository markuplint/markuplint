import type { Pretender } from '@markuplint/ml-config';

export type Identifier = Pretender['selector'];
export type Identity = Pretender['as'];

export type Attr = {
	nodeType: 'static' | 'boolean' | 'dynamic' | 'spread';
	name: string;
	value: string;
	type?: string;
};
