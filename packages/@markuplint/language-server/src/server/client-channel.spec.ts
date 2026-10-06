import { LogMessageNotification, MessageType, ShowMessageNotification } from 'vscode-languageserver/node.js';
import { describe, expect, test, vi } from 'vitest';

import { errorToPopup, logToDiagnosticsChannel, logToPrimaryChannel, status, warningToPopup } from '../lsp.js';

import { createClientChannel } from './client-channel.js';

function setup() {
	const sendNotification = vi.fn();
	const sendRequest = vi.fn(() => Promise.resolve());
	const channel = createClientChannel({ sendNotification, sendRequest });
	return { channel, sendNotification, sendRequest };
}

describe('without the extended protocol', () => {
	test('writes logs as window/logMessage', () => {
		const { channel, sendNotification } = setup();
		channel.log('hello', 'info');
		expect(sendNotification).toHaveBeenCalledWith(LogMessageNotification.type, {
			type: MessageType.Info,
			message: 'hello',
		});
	});

	test.each([
		['error', MessageType.Error],
		['warn', MessageType.Warning],
		['info', MessageType.Info],
		['debug', MessageType.Log],
	] as const)('maps the log type %s onto the LSP message type', (type, expected) => {
		const { channel, sendNotification } = setup();
		channel.log('m', type);
		expect(sendNotification).toHaveBeenCalledWith(LogMessageNotification.type, { type: expected, message: 'm' });
	});

	test('defaults the log type to debug', () => {
		const { channel, sendNotification } = setup();
		channel.log('m');
		expect(sendNotification).toHaveBeenCalledWith(LogMessageNotification.type, {
			type: MessageType.Log,
			message: 'm',
		});
	});

	test('does not write the trace log type, which is a line per engine phase', () => {
		const { channel, sendNotification } = setup();
		channel.log('phase', 'trace');
		expect(sendNotification).not.toHaveBeenCalled();
	});

	test('still writes the trace log type to the output channel of the extension', () => {
		const { channel, sendNotification } = setup();
		channel.configure(true);
		channel.log('phase', 'trace');
		expect(sendNotification).toHaveBeenCalledWith(logToPrimaryChannel, ['phase', 'trace']);
	});

	test('does not write the clear log type', () => {
		const { channel, sendNotification } = setup();
		channel.log('', 'clear');
		expect(sendNotification).not.toHaveBeenCalled();
	});

	test('writes diagnostics logs as window/logMessage', () => {
		const { channel, sendNotification } = setup();
		channel.diagnosticsLog('d');
		expect(sendNotification).toHaveBeenCalledWith(LogMessageNotification.type, {
			type: MessageType.Info,
			message: 'd',
		});
	});

	test('shows errors as the window/showMessage notification', () => {
		const { channel, sendNotification } = setup();
		channel.errorLog('boom');
		expect(sendNotification).toHaveBeenCalledWith(ShowMessageNotification.type, {
			type: MessageType.Error,
			message: 'boom',
		});
	});

	test('shows warnings as the window/showMessage notification', () => {
		const { channel, sendNotification } = setup();
		channel.warningPopup('careful');
		expect(sendNotification).toHaveBeenCalledWith(ShowMessageNotification.type, {
			type: MessageType.Warning,
			message: 'careful',
		});
	});

	test('sends no status request', () => {
		const { channel, sendRequest } = setup();
		channel.reportStatus({ version: '1.0.0', isLocalModule: true, message: null });
		expect(sendRequest).not.toHaveBeenCalled();
	});
});

describe('with the extended protocol', () => {
	test('uses the markuplint notifications', () => {
		const { channel, sendNotification } = setup();
		channel.configure(true);
		channel.log('a', 'info');
		channel.diagnosticsLog('b');
		channel.errorLog('c');
		channel.warningPopup('d');
		expect(sendNotification.mock.calls).toStrictEqual([
			[logToPrimaryChannel, ['a', 'info']],
			[logToDiagnosticsChannel, ['b', undefined]],
			[errorToPopup, 'c'],
			[warningToPopup, 'd'],
		]);
	});

	test('sends the status request', () => {
		const { channel, sendRequest } = setup();
		channel.configure(true);
		const current = { version: '1.0.0', isLocalModule: true, message: null };
		channel.reportStatus(current);
		expect(sendRequest).toHaveBeenCalledWith(status, current);
	});

	test('survives a client that rejects the status request', async () => {
		const sendNotification = vi.fn();
		const sendRequest = vi.fn(() => Promise.reject(new Error('MethodNotFound')));
		const channel = createClientChannel({ sendNotification, sendRequest });
		channel.configure(true);
		channel.reportStatus({ version: '1.0.0', isLocalModule: true, message: null });
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(sendNotification).toHaveBeenCalledWith(logToPrimaryChannel, [
			expect.stringContaining('MethodNotFound'),
			'warn',
		]);
	});
});
