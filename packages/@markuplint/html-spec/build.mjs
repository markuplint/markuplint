import path from 'node:path';

import { main } from '@markuplint/spec-generator';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await main({
	outputFilePath: path.resolve(__dirname, 'index.json'),
	htmlFilePattern: path.resolve(__dirname, 'src', 'spec.*.json'),
	commonAttrsFilePath: path.resolve(__dirname, 'src', 'spec-common.attributes.json'),
	commonContentsFilePath: path.resolve(__dirname, 'src', 'spec-common.contents.json'),
});
