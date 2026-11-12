import { defineConfig } from 'vitest/config';

import { RUST_CORE_ENV } from './scripts/rust-rule-parity/rust-engine.ts';
import { RULES_REGISTRY_ALIAS } from './scripts/rust-rule-parity/registry-alias.ts';

/**
 * The rule specs of `@markuplint/rules`, run against the Rust engine. See
 * `scripts/rust-rule-parity/setup.ts`.
 */
export default defineConfig({
	resolve: { alias: RULES_REGISTRY_ALIAS },
	test: {
		include: ['./packages/@markuplint/rules/src/*/**/*.spec.ts'],
		setupFiles: ['./scripts/rust-rule-parity/setup.ts'],
		env: { [RUST_CORE_ENV]: '1' },
		testTimeout: 10000,
		// As `vitest.config.ts`: the GC-sensitive specs force a collection
		execArgv: ['--expose-gc'],
	},
});
