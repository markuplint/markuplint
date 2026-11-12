import { defineConfig } from 'vitest/config';

import { RULES_REGISTRY_ALIAS } from './scripts/rust-rule-parity/registry-alias.ts';

/**
 * The rule specs of `@markuplint/rules`, with the Japanese messages of the Rust engine compared with
 * the TypeScript engine's. Not run by hand: `scripts/rust-rule-parity/ja-messages.ts` runs it and
 * reads what it records. The testing API is on the TypeScript engine here, whatever the shell has
 * exported: `ja-setup.ts` switches `MARKUPLINT_EXPERIMENTAL_RUST_CORE` for each of its two calls.
 */
export default defineConfig({
	resolve: { alias: RULES_REGISTRY_ALIAS },
	test: {
		include: ['./packages/@markuplint/rules/src/*/**/*.spec.ts'],
		setupFiles: ['./scripts/rust-rule-parity/ja-setup.ts'],
		// Each call runs two more engines than the spec does
		testTimeout: 30000,
		// As `vitest.config.ts`: the GC-sensitive specs force a collection
		execArgv: ['--expose-gc'],
	},
});
