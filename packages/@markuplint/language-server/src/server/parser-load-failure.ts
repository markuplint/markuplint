import type { Module } from './get-module.js';
import type { Log } from '../types.js';

import { isFatalError } from 'markuplint/suppressions';

import {
	BUNDLED_PARSER_LOAD_COMPAT_ERROR,
	BUNDLED_PARSER_LOAD_ERROR,
	BUNDLED_PRETENDERS_NOT_FOUND_ERROR,
	PARSER_NOT_FOUND_ERROR,
} from '../const.js';
import { t } from '../i18n.js';

const PRETENDERS_PACKAGE = '@markuplint/pretenders';

/**
 * What the document was linted with, needed to tell the user where the missing parser must be installed.
 */
export type ParserLoadFailureContext = {
	readonly languageId: string;
	readonly isLocalModule: boolean;
	readonly version: string;
	/** The working directory the module was resolved for */
	readonly workspace: string;
	readonly fallbackReason?: Module['fallbackReason'];
};

// `@markuplint/file-resolver` (v3+) rewrites a bare parser specifier that is not importable into an
// absolute path under the config's directory before giving up, so the reported specifier is
// usually `<configDir>/@markuplint/xxx-parser`, not the name the user wrote.
const PARSER_MODULE_NOT_FOUND = /Parser module "(?<spec>[^"]+)" is not found\./;
// Node's own messages: CommonJS `Cannot find module 'x'`, ESM `Cannot find package 'x' imported from …`.
// Only a bare package specifier counts here: a path means some file of an installed package is
// missing (a broken installation), not that a parser package is absent.
const CANNOT_FIND_PACKAGE = /Cannot find (?:module|package) '(?<spec>(?:@[\w.-]+\/)?[\w.-]+)'/;

/**
 * Extracts the package name of the parser that failed to load from an error message.
 *
 * @param message - The error message from `MLEngine#exec()`
 * @returns The package name (scoped when applicable), or `null` if the message is not a parser load failure
 */
export function extractMissingParserName(message: string): string | null {
	const rewritten = PARSER_MODULE_NOT_FOUND.exec(message)?.groups?.spec;
	if (rewritten) {
		return packageNameOf(rewritten);
	}
	return CANNOT_FIND_PACKAGE.exec(message)?.groups?.spec ?? null;
}

/**
 * Recovers the package name from a specifier the config resolver may have turned into a path.
 * A path ending in an unscoped segment is ambiguous (a package name or a parser file such as
 * `./parsers/custom.js`), so only scoped names are recovered from paths.
 */
function packageNameOf(spec: string): string | null {
	const segments = spec.replaceAll('\\', '/').replace(/\/+$/, '').split('/');
	const name = segments.at(-1);
	const scope = segments.at(-2);
	if (!name) {
		return null;
	}
	if (scope?.startsWith('@')) {
		return `${scope}/${name}`;
	}
	return segments.length === 1 ? name : null;
}

/**
 * Whether an error is what markuplint raises for a configuration that needs `@markuplint/pretenders` when it
 * is not installed: an error that says how to install it, with the `ERR_MODULE_NOT_FOUND` of the import as its
 * `cause`. It is reported as a `config-error` of the file (the `lint-error` event of `MLEngine`) rather than
 * as a rejection of `exec()`, so it is told by its cause.
 *
 * @param error - The error of the `lint-error` event, or of a rejection
 * @returns `true` when the cause is the missing `@markuplint/pretenders`
 */
export function isPretendersNotInstalled(error: unknown): boolean {
	return (
		error instanceof Error &&
		error.cause instanceof Error &&
		extractMissingParserName(error.cause.message) === PRETENDERS_PACKAGE
	);
}

/**
 * Builds the user-facing explanation for a parser load failure.
 *
 * @param error - The rejection from `MLEngine#exec()`, or the error of its `lint-error` event
 * @param context - Which markuplint module linted the document
 * @returns The message to show, or `null` if the error is not a parser load failure
 */
export function describeParserLoadFailure(error: unknown, context: ParserLoadFailureContext): string | null {
	if (!(error instanceof Error)) {
		return null;
	}
	if (isPretendersNotInstalled(error)) {
		if (context.isLocalModule) {
			// The message of the error says how to install it, which is the fix for a local markuplint.
			return error.message;
		}
		if (context.fallbackReason === 'import-assertion-compat') {
			return t(BUNDLED_PARSER_LOAD_COMPAT_ERROR, context.version, PRETENDERS_PACKAGE, context.workspace);
		}
		return t(BUNDLED_PRETENDERS_NOT_FOUND_ERROR, context.version, context.workspace);
	}
	const parser = extractMissingParserName(error.message);
	if (!parser) {
		return null;
	}
	if (context.isLocalModule) {
		return t(PARSER_NOT_FOUND_ERROR, parser, context.languageId);
	}
	if (context.fallbackReason === 'import-assertion-compat') {
		return t(BUNDLED_PARSER_LOAD_COMPAT_ERROR, context.version, parser, context.workspace);
	}
	return t(BUNDLED_PARSER_LOAD_ERROR, context.version, parser, context.workspace);
}

/**
 * Creates the `MLEngine#exec()` rejection handler for a document.
 *
 * @param context - Which markuplint module linted the document
 * @param errorLog - Popup logger
 * @returns A handler that reports parser load failures (and any other recoverable `Error`) and rethrows fatal errors
 */
export function createParserErrorHandler(context: ParserLoadFailureContext, errorLog: Log) {
	return (error: unknown) => {
		if (isFatalError(error)) {
			throw error;
		}
		const message = describeParserLoadFailure(error, context);
		if (message) {
			errorLog(message);
			return;
		}
		// Non-Error values are fatal per isFatalError() and were rethrown above.
		errorLog((error as Error).message);
	};
}
