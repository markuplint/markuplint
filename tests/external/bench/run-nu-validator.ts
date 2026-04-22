import { readFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import * as docker from './docker.ts';
import { collectHtmlFiles, deriveFilenameHint, pLimit, sha256Hex, writeJson } from './fs-utils.ts';
import { buildMessageIds } from './message-id.ts';
import type { NuRawMessage } from './nu-client.ts';
import { validate } from './nu-client.ts';
import { NU_SNAPSHOTS_DIR, VALIDATOR_TESTS_DIR } from './paths.ts';
import type { NuMessage, NuValidatorSnapshot } from './types.ts';

export type RunNuValidatorOptions = {
	readonly filter?: string;
	readonly concurrency?: number;
	readonly imageTag?: string;
	readonly dryRun?: boolean;
	readonly port?: number;
	readonly healthcheckTimeoutMs?: number;
};

export type RunNuValidatorResult = {
	readonly imageDigest: string;
	readonly totalFiles: number;
	readonly totalMessages: number;
	readonly failures: readonly { path: string; error: string }[];
};

const MAX_CONCURRENCY = 8;

function toSnapshotMessage(raw: NuRawMessage, id: string): NuMessage {
	return {
		id,
		type: raw.type,
		subType: raw.subType ?? null,
		message: raw.message,
		firstLine: raw.firstLine ?? null,
		lastLine: raw.lastLine ?? null,
		firstColumn: raw.firstColumn ?? null,
		lastColumn: raw.lastColumn ?? null,
		extract: raw.extract ?? null,
		hiliteStart: raw.hiliteStart ?? null,
		hiliteLength: raw.hiliteLength ?? null,
	};
}

function sortMessages(messages: readonly NuMessage[]): NuMessage[] {
	return [...messages].sort((a, b) => {
		return (
			(a.firstLine ?? 0) - (b.firstLine ?? 0) ||
			(a.firstColumn ?? 0) - (b.firstColumn ?? 0) ||
			a.type.localeCompare(b.type) ||
			a.message.localeCompare(b.message)
		);
	});
}

export async function runNuValidator(options: RunNuValidatorOptions = {}): Promise<RunNuValidatorResult> {
	const files = await collectHtmlFiles(VALIDATOR_TESTS_DIR, options.filter);
	if (files.length === 0) {
		throw new Error(`no HTML files matched under ${VALIDATOR_TESTS_DIR} (filter=${options.filter ?? '**/*.html'})`);
	}

	if (options.dryRun) {
		return {
			imageDigest: 'dry-run',
			totalFiles: files.length,
			totalMessages: 0,
			failures: [],
		};
	}

	const cleanup = docker.installCleanupHandler();
	const started = await docker.start({
		image: options.imageTag,
		port: options.port,
		healthcheckTimeoutMs: options.healthcheckTimeoutMs,
	});
	const baseUrl = `http://localhost:${started.port}`;
	const concurrency = Math.min(options.concurrency ?? Math.max(1, availableParallelism() - 1), MAX_CONCURRENCY);

	const failures: { path: string; error: string }[] = [];
	let totalMessages = 0;

	try {
		await pLimit(files, concurrency, async relPath => {
			const absolute = join(VALIDATOR_TESTS_DIR, relPath);
			const html = await readFile(absolute, 'utf8');
			const result = await validate(html, { baseUrl });

			const rawMessages = result.ok ? result.messages : [];
			const ids = buildMessageIds(
				rawMessages.map(m => ({
					path: relPath,
					type: m.type,
					message: m.message,
					firstLine: m.firstLine ?? null,
					firstColumn: m.firstColumn ?? null,
				})),
			);
			const messages = sortMessages(rawMessages.map((m, i) => toSnapshotMessage(m, ids[i] as string)));
			totalMessages += messages.length;

			const snapshot: NuValidatorSnapshot = {
				source: {
					path: relPath,
					sha256: sha256Hex(html),
					filenameHint: deriveFilenameHint(relPath),
				},
				nuValidator: {
					imageDigest: started.imageDigest,
					messages,
					...(result.ok ? {} : { error: result.error }),
				},
			};

			if (!result.ok) {
				failures.push({ path: relPath, error: result.error });
			}

			const outPath = join(NU_SNAPSHOTS_DIR, relPath.replace(/\.html$/, '.json'));
			await writeJson(outPath, snapshot);
		});
	} finally {
		cleanup();
		await docker.stop().catch(() => {
			/* best effort */
		});
	}

	return {
		imageDigest: started.imageDigest,
		totalFiles: files.length,
		totalMessages,
		failures,
	};
}
