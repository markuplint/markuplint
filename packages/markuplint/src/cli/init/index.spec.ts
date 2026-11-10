import { beforeEach, describe, test, expect, vi } from 'vitest';

const installModuleMock = vi.fn<() => Promise<unknown>>();

vi.mock('@markuplint/cli-utils', () => ({
	header: () => '',
	multiSelect: () => Promise.resolve([]),
	// "Install npm dependencies?" is answered yes, the others no.
	confirm: (message: string) => Promise.resolve(message.startsWith('Install')),
	confirmSequence: () => Promise.resolve({}),
	installModule: () => installModuleMock(),
}));
vi.mock('node:fs/promises', () => ({ default: { writeFile: () => Promise.resolve() } }));

const { initialize } = await import('./index.js');

describe('initialize', () => {
	beforeEach(() => {
		installModuleMock.mockReset();
		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
	});

	test('rejects with the error of a failed install as it is', async () => {
		const failure = new Error('install failed');
		installModuleMock.mockRejectedValue(failure);
		await expect(initialize()).rejects.toBe(failure);
	});

	test('rejects with an Error when the install fails with a value that is not one', async () => {
		installModuleMock.mockRejectedValue('install failed');
		await expect(initialize()).rejects.toStrictEqual(new Error('install failed'));
	});

	test('resolves when the modules are installed', async () => {
		installModuleMock.mockResolvedValue({ success: true, alreadyExists: false });
		await expect(initialize()).resolves.toBeUndefined();
	});
});
