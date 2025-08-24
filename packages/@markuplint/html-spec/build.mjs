import path from 'node:path';

import { main } from '@markuplint/spec-generator';

await main({
	outputFilePath: path.resolve(import.meta.dirname, 'index.json'),
	htmlFilePattern: path.resolve(import.meta.dirname, 'src', 'spec.*.json'),
	commonAttrsFilePath: path.resolve(import.meta.dirname, 'src', 'spec-common.attributes.json'),
	commonContentsFilePath: path.resolve(import.meta.dirname, 'src', 'spec-common.contents.json'),
});
