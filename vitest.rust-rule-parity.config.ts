import { defineConfig } from 'vitest/config';

/**
 * The rule specs of `@markuplint/rules`, run against the Rust engine. See
 * `scripts/rust-rule-parity/setup.ts`.
 */
export default defineConfig({
	test: {
		include: ['./packages/@markuplint/rules/src/*/**/*.spec.ts'],
		setupFiles: ['./scripts/rust-rule-parity/setup.ts'],
		testTimeout: 10000,
		// As `vitest.config.ts`: the GC-sensitive specs force a collection
		execArgv: ['--expose-gc'],
	},
});
