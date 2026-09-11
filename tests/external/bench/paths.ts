/**
 * Absolute path constants used across the benchmark pipeline. All paths are
 * resolved relative to this module's own location via `import.meta.url` so
 * the scripts work regardless of the caller's `process.cwd()`.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const benchDir = dirname(fileURLToPath(import.meta.url));

/** `tests/external/` directory root. */
export const EXTERNAL_DIR = dirname(benchDir);
/** Repository root (four levels above `bench/`). */
export const REPO_ROOT = join(EXTERNAL_DIR, '..', '..');
/** `validator/validator/tests/` — HTML fixtures to feed into both tools. */
export const VALIDATOR_TESTS_DIR = join(EXTERNAL_DIR, 'validator', 'tests');
/** `tests/external/snapshots/` — git-tracked derivative set + gitignored raw trees. */
export const SNAPSHOTS_DIR = join(EXTERNAL_DIR, 'snapshots');
/** `tests/external/snapshots/nu-validator/` — raw nu-validator output (gitignored). */
export const NU_SNAPSHOTS_DIR = join(SNAPSHOTS_DIR, 'nu-validator');
/** `tests/external/snapshots/markuplint/` — raw markuplint output (gitignored). */
export const ML_SNAPSHOTS_DIR = join(SNAPSHOTS_DIR, 'markuplint');
/** `tests/external/snapshots/diff/` — per-file verdict and summaries (tracked). */
export const DIFF_DIR = join(SNAPSHOTS_DIR, 'diff');
/** `tests/external/snapshots/meta.json` — reproducibility metadata (tracked). */
export const META_PATH = join(SNAPSHOTS_DIR, 'meta.json');
/** `tests/external/snapshots/excluded-ids.json` — curated nu-over suppressions. */
export const EXCLUDED_IDS_PATH = join(SNAPSHOTS_DIR, 'excluded-ids.json');
/** `tests/external/snapshots/diff/nu-failures.json` — files where the nu call errored. */
export const NU_FAILURES_PATH = join(DIFF_DIR, 'nu-failures.json');
/** `tests/external/snapshots/diff/markuplint-only.json` — fixtures only markuplint flagged. */
export const ML_ONLY_PATH = join(DIFF_DIR, 'markuplint-only.json');
/** `tests/external/snapshots/diff/nu-only.json` — fixtures only nu-validator flagged (no spec ruling yet). */
export const NU_ONLY_PATH = join(DIFF_DIR, 'nu-only.json');
/** `tests/external/snapshots/diff/nu-over.json` — nu-validator errors confirmed as over-detection via spec-backed exclusions. */
export const NU_OVER_PATH = join(DIFF_DIR, 'nu-over.json');
/** `tests/external/spec/nu-validator.spec.ts` — generated dispatcher. */
export const SPEC_PATH = join(EXTERNAL_DIR, 'spec', 'nu-validator.spec.ts');
