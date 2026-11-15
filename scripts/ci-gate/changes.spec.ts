import { describe, expect, test } from 'vitest';

import { touchedGates } from './changes.ts';

describe('touchedGates', () => {
	test.each([
		{ files: ['crates/markuplint-core/src/lib.rs'], rust: true, cargo_deny: true },
		{ files: ['crates/Cargo.lock'], rust: true, cargo_deny: true },
		// The napi side of the addon that `napi-smoke` builds on the three OSes: not a licence matter.
		{ files: ['packages/@markuplint/core/package.json'], rust: true, cargo_deny: false },
		{
			files: ['packages/@markuplint/core-extra/a.ts', 'packages/@markuplint/ml-core/a.ts'],
			rust: false,
			cargo_deny: false,
		},
		// The policy of the licence check, wherever the file lives (it is `crates/deny.toml` now).
		{ files: ['deny.toml'], rust: false, cargo_deny: true },
		{ files: ['.github/workflows/rust.yml'], rust: true, cargo_deny: false },
		{ files: ['.github/workflows/cargo-deny.yml'], rust: false, cargo_deny: true },
		{ files: ['packages/@markuplint/rules/src/a.ts', 'package.json'], rust: false, cargo_deny: false },
		{ files: ['package.json', 'crates/a.rs'], rust: true, cargo_deny: true },
		// The directory is `crates/`, not a prefix of the name.
		{ files: ['crates-extra/a.rs', 'x/crates/a.rs'], rust: false, cargo_deny: false },
		// The files are the workflows themselves, not the others of the directory.
		{ files: ['.github/workflows/rust.yml.bak', '.github/workflows/test.yml'], rust: false, cargo_deny: false },
		{ files: [], rust: false, cargo_deny: false },
	])('$files gives rust=$rust cargo_deny=$cargo_deny', ({ files, rust, cargo_deny }) => {
		expect(touchedGates(files)).toStrictEqual({ rust, cargo_deny });
	});
});
