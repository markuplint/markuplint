import { mlRuleTest } from 'markuplint';
import { expect, test, vi } from 'vitest';

import noDuplicateId from './no-duplicate-id/index.js';

/**
 * `mlRuleTest()` runs a rule by its registered name, found by the identity of the seed object. A
 * spec that tests the source of a rule therefore tests it only if the TypeScript engine builds the
 * rule from that same source: were `@markuplint/rules` resolved to the built `lib` there, a rule
 * under edit would be tested against its old build, and every spec of the package would pass.
 * `vitest.config.ts` redirects `@markuplint/rules` to its source for that.
 *
 * The spy is installed before the first lint of the file: the engine builds its rules once, from the
 * registry, and keeps them.
 */
test('the TypeScript engine runs the rule that the spec imports', async () => {
	const verify = vi.spyOn(noDuplicateId, 'verify');

	try {
		const { violations } = await mlRuleTest(noDuplicateId, '<p id="a"></p><p id="a"></p>');

		expect(violations).toHaveLength(1);
		expect(verify).toHaveBeenCalled();
	} finally {
		verify.mockRestore();
	}
});
