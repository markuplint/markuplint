import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const benchDir = dirname(fileURLToPath(import.meta.url));

export const EXTERNAL_DIR = dirname(benchDir);
export const REPO_ROOT = join(EXTERNAL_DIR, '..', '..');
export const VALIDATOR_TESTS_DIR = join(EXTERNAL_DIR, 'validator', 'tests');
export const SNAPSHOTS_DIR = join(EXTERNAL_DIR, 'snapshots');
export const NU_SNAPSHOTS_DIR = join(SNAPSHOTS_DIR, 'nu-validator');
export const ML_SNAPSHOTS_DIR = join(SNAPSHOTS_DIR, 'markuplint');
export const DIFF_DIR = join(SNAPSHOTS_DIR, 'diff');
export const META_PATH = join(SNAPSHOTS_DIR, 'meta.json');
export const EXCLUDED_IDS_PATH = join(SNAPSHOTS_DIR, 'excluded-ids.json');
export const SPEC_PATH = join(EXTERNAL_DIR, 'spec', 'nu-validator.spec.ts');
