import type { TagRule } from './types.js';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { describe, expect, test } from 'vitest';

import { cachedSpecs } from './content-model.js';

// A document has the specs of its own (the `specs` of the config is by file: an HTML file and a Vue file,
// extended by `@markuplint/vue-spec`, are linted in one run), so the specs merged with the `tag` rules are kept
// for each of them, not for the rules alone.
describe('cachedSpecs', () => {
	const specsOf = (...names: string[]) =>
		({ specs: names.map(name => ({ name })), def: {}, cites: [] }) as unknown as MLMLSpec;
	const rules: TagRule[] = [{ tag: 'x-a', contents: [{ require: 'x-b' }] }];

	test('[permitted-contents-issue-4314-010] merges the tag rules into the specs of the document', () => {
		const merged = cachedSpecs(specsOf('a'), rules);

		expect(merged.specs.map(spec => spec.name)).toStrictEqual(['a', 'x-a']);
	});

	test('[permitted-contents-issue-4314-011] two documents with different specs and the same rules do not share what is merged', () => {
		const first = specsOf('a');
		const second = specsOf('b');

		expect(cachedSpecs(first, rules).specs.map(spec => spec.name)).toStrictEqual(['a', 'x-a']);
		expect(cachedSpecs(second, rules).specs.map(spec => spec.name)).toStrictEqual(['b', 'x-a']);
		expect(cachedSpecs(first, rules).specs.map(spec => spec.name)).toStrictEqual(['a', 'x-a']);
	});

	test('[permitted-contents-issue-4314-012] the same specs and the same rules give the merged specs again', () => {
		const specs = specsOf('a');

		expect(cachedSpecs(specs, [...rules])).toBe(cachedSpecs(specs, [...rules]));
		expect(cachedSpecs(specs, [{ tag: 'x-c', contents: [] }])).not.toBe(cachedSpecs(specs, rules));
	});

	test('[permitted-contents-issue-4314-013] without rules the specs are returned as they are', () => {
		const specs = specsOf('a');

		expect(cachedSpecs(specs, [])).toBe(specs);
	});
});
