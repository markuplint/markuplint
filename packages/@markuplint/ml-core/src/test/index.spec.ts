import { describe, test, expect } from 'vitest';

import { createTestDocument } from './index.js';

describe('createTestDocument', () => {
	test('gives the document the settings of the parser, as the linter does', async () => {
		const vue = await import('@markuplint/vue-parser');
		const jsx = await import('@markuplint/jsx-parser');
		const vueDocument = createTestDocument('<template><FooBar /></template>', { parser: vue.parser });
		expect(vueDocument.componentNameVariants).toBe(true);
		expect(vueDocument.tagNameCaseSensitive).toBe(false);
		const jsxDocument = createTestDocument('<FooBar />', { parser: jsx.parser });
		expect(jsxDocument.componentNameVariants).toBe(false);
		expect(jsxDocument.tagNameCaseSensitive).toBe(true);
	});
});
