/**
 * @module pretender-file-path
 *
 * `Pretender.filePath` encodes a source location as `<path>:<line>:<col>`.
 * Both `@markuplint/pretenders` and `@markuplint/file-resolver` need to parse
 * and rebase that string — the former to point at the eventual output JSON's
 * own location, the latter to make it absolute right after reading each
 * config source — so the format is owned here rather than re-implemented
 * (with a slightly different regex each time) in every consumer.
 */

import type { Pretender } from './types.js';

/** A parsed `Pretender.filePath`. `line`/`col` stay as strings — nothing here needs them as numbers. */
export interface PretenderFileLocation {
	readonly path: string;
	readonly line: string;
	readonly col: string;
}

const RE_FILE_PATH_LOCATION = /^(.*):(\d+):(\d+)$/;

/**
 * @param filePath - A `Pretender.filePath` value
 * @returns The parsed location, or `null` if `filePath` doesn't end in `:<line>:<col>`
 */
export function parsePretenderFilePath(filePath: string): PretenderFileLocation | null {
	const match = RE_FILE_PATH_LOCATION.exec(filePath);
	if (!match) {
		return null;
	}
	const [, path, line, col] = match;
	return { path: path!, line: line!, col: col! };
}

/**
 * @param location - A parsed `Pretender.filePath` location
 * @returns The location formatted back into the canonical `<path>:<line>:<col>` string
 */
export function formatPretenderFilePath(location: PretenderFileLocation): string {
	return `${location.path}:${location.line}:${location.col}`;
}

/**
 * Rebases a `Pretender`'s `filePath` by applying `transform` to its path
 * portion only, leaving `:<line>:<col>` untouched. Entries without a
 * `filePath`, or whose `filePath` doesn't match the expected format, are
 * returned unchanged.
 *
 * @param pretender - The pretender whose `filePath` should be rebased
 * @param transform - Maps the path portion of `filePath` to its rebased form
 * @returns A new `Pretender` with the rebased `filePath`, or `pretender`
 *   itself (same reference) when there was nothing to rebase
 */
export function rebasePretenderFilePath(
	pretender: Readonly<Pretender>,
	transform: (path: string) => string,
): Pretender {
	if (!pretender.filePath) {
		return pretender;
	}

	const location = parsePretenderFilePath(pretender.filePath);
	if (!location) {
		return pretender;
	}

	return { ...pretender, filePath: formatPretenderFilePath({ ...location, path: transform(location.path) }) };
}
