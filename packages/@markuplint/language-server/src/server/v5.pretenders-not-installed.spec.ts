import type { MLEngine } from 'markuplint';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { describe, expect, test, vi } from 'vitest';

import { onDidOpen } from './v5.js';

type Handler = (...args: readonly unknown[]) => void;

/** What `MLEngine` reports for a configuration that needs `@markuplint/pretenders` when it is not installed. */
const notInstalled = new Error('The "pretenders.scan" option needs @markuplint/pretenders, which is not installed.', {
	cause: Object.assign(new Error("Cannot find package '@markuplint/pretenders' imported from /x/lib/a.js"), {
		code: 'ERR_MODULE_NOT_FOUND',
	}),
});

/**
 * An engine that reports `lintError` as the failure of its lint, as `MLEngine` does for a configuration
 * that cannot be used (`lint-error`), and settles.
 */
function engineThatFails(lintError: Error) {
	const engines: FakeEngine[] = [];

	class FakeEngine {
		static toMLFile() {
			return Promise.resolve({ path: '/repo/index.html' });
		}

		readonly #handlers = new Map<string, Handler>();

		constructor() {
			engines.push(this);
		}

		on(name: string, handler: Handler) {
			this.#handlers.set(name, handler);
		}

		exec() {
			this.lintFails();
			return Promise.resolve();
		}

		/** The lint fails again, as it does on the next edit of the document. */
		lintFails() {
			this.#handlers.get('lint-error')?.('/repo/index.html', '<p></p>', lintError);
		}
	}

	return { Engine: FakeEngine as unknown as typeof MLEngine, engines };
}

async function open(uri: string, lintError: Error) {
	const notFoundParserError = vi.fn();
	const diagnosticsLog = vi.fn();
	const { Engine, engines } = engineThatFails(lintError);

	await onDidOpen(
		TextDocument.create(uri, 'html', 1, '<p></p>'),
		Engine,
		{} as never,
		'en',
		vi.fn(),
		diagnosticsLog,
		vi.fn(),
		notFoundParserError,
		'/repo',
	);
	// `exec()` is started without being awaited
	await new Promise(resolve => setTimeout(resolve, 0));

	return { notFoundParserError, diagnosticsLog, engines };
}

describe('v5 onDidOpen when the lint fails', () => {
	test('shows the popup for the pretenders that is not installed, and logs the message as it did', async () => {
		const { notFoundParserError, diagnosticsLog } = await open('file:///repo/a.html', notInstalled);

		expect(notFoundParserError).toHaveBeenCalledTimes(1);
		expect(notFoundParserError).toHaveBeenCalledWith(notInstalled);
		expect(diagnosticsLog).toHaveBeenCalledWith(notInstalled.message, 'error');
	});

	test('shows the popup once for a document, however many times the lint fails again', async () => {
		const { notFoundParserError, diagnosticsLog, engines } = await open('file:///repo/c.html', notInstalled);

		engines[0]!.lintFails();
		engines[0]!.lintFails();

		expect(notFoundParserError).toHaveBeenCalledTimes(1);
		// the diagnostic is logged every time
		expect(diagnosticsLog.mock.calls.filter(([message]) => message === notInstalled.message)).toHaveLength(3);
	});

	test('does not show a popup for another failure of the lint, a cause included', async () => {
		const other = new Error('The config file could not be loaded', { cause: new Error('boom') });

		const { notFoundParserError, diagnosticsLog } = await open('file:///repo/b.html', other);

		expect(notFoundParserError).not.toHaveBeenCalled();
		expect(diagnosticsLog).toHaveBeenCalledWith(other.message, 'error');
	});
});
