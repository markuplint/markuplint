import { defineConfig } from 'vitest/config';

/**
 * The rule specs of `@markuplint/rules`, with the Japanese messages of the Rust engine compared with
 * the TypeScript engine's. Not run by hand: `scripts/rust-rule-parity/ja-messages.ts` runs it and
 * reads what it records.
 */
export default defineConfig({
	test: {
		include: ['./packages/@markuplint/rules/src/*/**/*.spec.ts'],
		setupFiles: ['./scripts/rust-rule-parity/ja-setup.ts'],
		// Each call runs two more engines than the spec does
		testTimeout: 30000,
		// As `vitest.config.ts`: the GC-sensitive specs force a collection
		execArgv: ['--expose-gc'],
	},
});
