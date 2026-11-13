import { defineConfig } from 'vitest/config';

import { RULES_REGISTRY_ALIAS } from './scripts/rust-rule-parity/registry-alias.ts';

export default defineConfig({
	// The testing API runs a rule by its registered name, and finds the name by the identity of the
	// object: the rule a spec imports has to be the registry's own, not that of the built `lib`.
	// `packages/@markuplint/rules/src/registry-identity.spec.ts` fails when the engine runs another.
	resolve: { alias: RULES_REGISTRY_ALIAS },
	test: {
		include: [
			'./packages/**/*.spec.{js,mjs,ts}',
			'./vscode/scripts/**/*.spec.{js,mjs,ts}',
			'./tests/external/bench/*.spec.{js,mjs,ts}',
			'./scripts/**/*.spec.{js,mjs,ts}',
		],
		exclude: ['./packages/@markuplint/core/e2e.spec.ts'],
		testTimeout: 10000,
		// `--expose-gc` lets a few GC-sensitive regression tests (e.g. the
		// per-document NodeStore scoping in `@markuplint/ml-core`) force a
		// synchronous collection and assert via `WeakRef` that nothing still
		// holds the old reference, instead of guessing at GC timing. This
		// presumes the default `forks` pool: Node rejects `--expose-gc` in a
		// worker thread's `execArgv` (`ERR_WORKER_INVALID_EXEC_ARGV`), so with
		// `--pool=threads` no test file would start.
		execArgv: ['--expose-gc'],
	},
});
