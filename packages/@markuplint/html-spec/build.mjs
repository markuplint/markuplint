import path from 'node:path';

// eslint-disable-next-line import/no-extraneous-dependencies
import { main } from '@markuplint/spec-generator';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

await main({
	outputFilePath: path.resolve(__dirname, 'index.json'),
	htmlFilePattern: path.resolve(__dirname, 'src', 'spec.*.json'),
	commonAttrsFilePath: path.resolve(__dirname, 'src', 'spec-common.attributes.json'),
	commonContentsFilePath: path.resolve(__dirname, 'src', 'spec-common.contents.json'),
});
