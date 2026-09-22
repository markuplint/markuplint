import type { Module } from './get-module.js';

import { describe, expect, test, vi } from 'vitest';

import { createModuleNotices } from './module-notices.js';

vi.mock('../i18n.js', () => ({
	t: (template: string, ...args: readonly unknown[]) =>
		template.replaceAll(/\{(\d+)\*?\}/g, (_, index: string) => String(args[Number(index)] ?? '')),
}));

const NO_INSTALL =
	'since markuplint could not be found in the node_modules of the workspace, this use the version (v5.0.0) installed in VS Code Extension. ';
const COMPAT =
	'your local markuplint is incompatible with Node.js 22+ due to import assertion syntax. The bundled version (v5.0.0) is used instead. To use your local version, upgrade to markuplint@4.10.0 or later. See: https://github.com/markuplint/markuplint/issues/2837';

function module(overrides: Partial<Module>): Module {
	return {
		isLocalModule: true,
		version: '5.0.0',
		moduleType: 'module',
		markuplint: {},
		ariaRecommendedVersion: '1.2',
		workspace: '/repo/app',
		...overrides,
	};
}

function setup() {
	const log = vi.fn();
	const popup = vi.fn();
	const sendStatus = vi.fn();
	const notices = createModuleNotices({ log, popup, sendStatus });
	return { notices, log, popup, sendStatus };
}

describe('reportStatus', () => {
	test('sends the version with no message for a local module', () => {
		const { notices, sendStatus } = setup();
		notices.reportStatus(module({ isLocalModule: true }));
		expect(sendStatus).toHaveBeenCalledWith({ version: '5.0.0', isLocalModule: true, message: null });
	});

	test('sends the not-installed message for the bundled module', () => {
		const { notices, sendStatus } = setup();
		notices.reportStatus(module({ isLocalModule: false }));
		expect(sendStatus).toHaveBeenCalledWith({ version: '5.0.0', isLocalModule: false, message: NO_INSTALL });
	});
});

describe('onFirstResolve', () => {
	test('logs the resolved module and stays silent otherwise for a local module', () => {
		const { notices, log, popup } = setup();
		notices.onFirstResolve(module({ isLocalModule: true, workspace: '/repo/app' }));
		expect(log).toHaveBeenCalledTimes(1);
		expect(log).toHaveBeenCalledWith('Found version: 5.0.0 (isLocalModule: true) for /repo/app', 'info');
		expect(popup).not.toHaveBeenCalled();
	});

	test('warns in the log, without a popup, when the bundled module is used', () => {
		const { notices, log, popup } = setup();
		notices.onFirstResolve(module({ isLocalModule: false }));
		expect(log).toHaveBeenCalledWith(NO_INSTALL, 'warn');
		expect(popup).not.toHaveBeenCalled();
	});

	test('shows the import assertion popup once per session while logging it per directory', () => {
		const { notices, log, popup } = setup();
		notices.onFirstResolve(
			module({ isLocalModule: false, fallbackReason: 'import-assertion-compat', workspace: '/a' }),
		);
		notices.onFirstResolve(
			module({ isLocalModule: false, fallbackReason: 'import-assertion-compat', workspace: '/b' }),
		);
		expect(popup).toHaveBeenCalledTimes(1);
		expect(popup).toHaveBeenCalledWith(COMPAT);
		expect(log.mock.calls.filter(([message, type]) => message === COMPAT && type === 'warn')).toHaveLength(2);
	});
});
