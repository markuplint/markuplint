import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'./packages/**/*.spec.{js,mjs,ts}',
			'./vscode/src/**/*.spec.{js,mjs,ts}',
			'./vscode/scripts/**/*.spec.{js,mjs,ts}',
			'./tests/external/bench/*.spec.{js,mjs,ts}',
		],
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
