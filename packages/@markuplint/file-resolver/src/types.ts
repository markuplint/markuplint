import { Config } from '@markuplint/ml-config';

export { Config } from '@markuplint/ml-config';

export interface ConfigSet {
	config: Config;
	files: Set<string>;
	errs: Error[];
}
