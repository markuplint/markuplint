import { readFile, rm } from 'node:fs/promises';

import { afterAll, describe, expect, test } from 'vitest';

import { generateSpec } from './generate-spec.ts';
import { SPEC_PATH } from './paths.ts';

describe('generateSpec', () => {
	let originalContent: string | null = null;

	// Preserve any existing generated spec so the test does not stomp the
	// real artefact committed in the repository.
	async function snapshotExisting() {
		try {
			originalContent = await readFile(SPEC_PATH, 'utf8');
		} catch {
			originalContent = null;
		}
	}

	afterAll(async () => {
		if (originalContent === null) {
			await rm(SPEC_PATH, { force: true });
			return;
		}
		const { writeFile, mkdir } = await import('node:fs/promises');
		const { dirname } = await import('node:path');
		await mkdir(dirname(SPEC_PATH), { recursive: true });
		await writeFile(SPEC_PATH, originalContent, 'utf8');
	});

	test('writes a spec file containing the DO NOT EDIT marker', async () => {
		await snapshotExisting();
		await generateSpec();
		const out = await readFile(SPEC_PATH, 'utf8');
		expect(out).toContain('DO NOT EDIT');
		expect(out).toContain("yarn bench:generate-spec");
	});

	test('imports coverage.json and wires describe/test per category', async () => {
		await snapshotExisting();
		await generateSpec();
		const out = await readFile(SPEC_PATH, 'utf8');
		expect(out).toContain("import coverage from '../snapshots/diff/coverage.json'");
		expect(out).toContain("describe('nu-validator benchmark'");
		expect(out).toContain('for (const [category, categoryEntries] of byCategory)');
		expect(out).toContain('await verifyEntry(entry.path)');
	});

	test('is idempotent: calling twice produces byte-identical output', async () => {
		await snapshotExisting();
		await generateSpec();
		const first = await readFile(SPEC_PATH, 'utf8');
		await generateSpec();
		const second = await readFile(SPEC_PATH, 'utf8');
		expect(second).toBe(first);
	});
});
