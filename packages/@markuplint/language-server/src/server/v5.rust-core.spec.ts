import type { MLEngine } from 'markuplint';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { describe, expect, test, vi } from 'vitest';

import { onDidOpen } from './v5.js';

type Handler = (...args: readonly unknown[]) => void;

/**
 * A stand-in for `MLEngine`. `rustCapable` is whether the markuplint the server loaded has what the
 * server reads of the Rust engine (`accessibilityAt`).
 */
function engineClass(rustCapable: boolean) {
	const engines: FakeEngine[] = [];
	const options: unknown[] = [];

	class FakeEngine {
		static toMLFile() {
			return Promise.resolve({ path: '/repo/index.html' });
		}

		readonly #handlers = new Map<string, Handler>();

		constructor(_file: unknown, option: unknown) {
			options.push(option);
			engines.push(this);
		}

		on(name: string, handler: Handler) {
			this.#handlers.set(name, handler);
		}

		exec() {
			return Promise.resolve();
		}

		/** What `MLEngine` emits as `log`. */
		log(phase: string, message: string) {
			this.#handlers.get('log')?.(phase, message);
		}
	}
	if (rustCapable) {
		Object.defineProperty(FakeEngine.prototype, 'accessibilityAt', { value: () => null });
	}

	return { Engine: FakeEngine as unknown as typeof MLEngine, engines, options };
}

let opened = 0;

async function open(rustCapable: boolean, experimentalRustCore: boolean | undefined) {
	const log = vi.fn();
	const { Engine, engines, options } = engineClass(rustCapable);

	await onDidOpen(
		// the engines are kept by URI for the life of the module
		TextDocument.create(`file:///repo/${opened++}.html`, 'html', 1, '<p></p>'),
		Engine,
		{} as never,
		'en',
		log,
		vi.fn(),
		vi.fn(),
		vi.fn(),
		'/repo',
		experimentalRustCore,
	);
	await new Promise(resolve => setTimeout(resolve, 0));

	return { log, engines, options: options[0] as Record<string, unknown> };
}

describe('v5 onDidOpen and experimentalRustCore', () => {
	test('passes it on to a markuplint that has the Rust engine', async () => {
		const { options } = await open(true, true);

		expect(options.experimentalRustCore).toBe(true);
	});

	test.each([false, undefined])('does not pass it on when the setting is %s', async setting => {
		const { options, log } = await open(true, setting);

		expect(options.experimentalRustCore).toBeUndefined();
		expect(log.mock.calls.filter(([message]) => String(message).includes('experimentalRustCore'))).toStrictEqual(
			[],
		);
	});

	test('does not pass it on to a markuplint that cannot lint with the Rust engine for the language server, and says so', async () => {
		const { options, log } = await open(false, true);

		expect(options.experimentalRustCore).toBeUndefined();
		expect(log).toHaveBeenCalledWith(expect.stringContaining('experimentalRustCore'), 'info');
	});

	test('logs the fallback to the TypeScript engine once for a document, as a warning', async () => {
		const { log, engines } = await open(true, true);
		const message = '⚠ [experimental-rust-core] "/repo/a.html" has custom plugin rules — falling back.';

		engines[0]!.log('experimental-rust-core:fallback', message);
		engines[0]!.log('experimental-rust-core:fallback', message);
		engines[0]!.log('resolveConfig', 'x');

		expect(log.mock.calls.filter(([, type]) => type === 'warn')).toStrictEqual([[message, 'warn']]);
	});
});
