import specs0 from '@markuplint/html-spec';
import { test, expect } from 'vitest';

test('the elements of the bundled spec data that are deprecated without being obsolete are the two that the README names', () => {
	const names = specs0.specs
		.filter(spec => (spec as { deprecated?: true }).deprecated && !(spec as { obsolete?: unknown }).obsolete)
		.map(spec => spec.name);
	expect(names).toStrictEqual(['mml:maction', 'mml:mfenced']);
});
