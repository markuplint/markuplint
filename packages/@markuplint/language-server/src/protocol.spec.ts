import { describe, expect, test } from 'vitest';

import {
	errorToPopup,
	ID,
	infoToPopup,
	logToDiagnosticsChannel,
	logToPrimaryChannel,
	NAME,
	status,
	warningToPopup,
} from './protocol.js';

// The VS Code extension and the server are released together, but an older extension can still
// meet a newer server (and the reverse), so these names are part of the contract.
describe('protocol', () => {
	test('identifies markuplint', () => {
		expect(ID).toBe('markuplint');
		expect(NAME).toBe('Markuplint');
	});

	test.each([
		['status', status, 'markuplint/ready'],
		['logToPrimaryChannel', logToPrimaryChannel, 'markuplint/log-primary-channel'],
		['logToDiagnosticsChannel', logToDiagnosticsChannel, 'markuplint/log-diagnostics-channel'],
		['errorToPopup', errorToPopup, 'markuplint/error-popup'],
		['warningToPopup', warningToPopup, 'markuplint/warning-popup'],
		['infoToPopup', infoToPopup, 'markuplint/info-popup'],
	] as const)('keeps the method name of %s', (_, type, method) => {
		expect(type.method).toBe(method);
	});
});
