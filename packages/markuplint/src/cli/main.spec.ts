// `main()` is called in-process so that the branches a spawned process cannot reach (a failing
// standard input, a failing `--init`) are covered. `bootstrap.ts` parses `process.argv` as it is
// imported, so every test sets the arguments and loads the modules afresh.
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';

const textMock = vi.fn<() => Promise<string>>();
const initializeMock = vi.fn<() => Promise<void>>();
const commandMock = vi.fn<() => Promise<boolean>>();

vi.mock('node:stream/consumers', () => ({ text: () => textMock() }));
vi.mock('./init/index.js', () => ({ initialize: () => initializeMock() }));
vi.mock('./command.js', () => ({ command: () => commandMock() }));

const originalArgv = process.argv;

async function run(...args: string[]) {
	process.argv = ['node', 'markuplint', ...args];
	vi.resetModules();
	const { main } = await import('./main.js');
	return main();
}

describe('main', () => {
	let stderr: string[];

	beforeEach(() => {
		stderr = [];
		vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
			stderr.push(String(chunk));
			return true;
		});
		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
	});

	afterEach(() => {
		process.argv = originalArgv;
		vi.restoreAllMocks();
		textMock.mockReset();
		initializeMock.mockReset();
		commandMock.mockReset();
	});

	test('a failure to read the standard input is reported on stderr and exits with 1', async () => {
		textMock.mockRejectedValue(new Error('stdin is broken'));
		await expect(run('-')).resolves.toBe(1);
		expect(stderr.join('')).toBe('Error: stdin is broken\n');
	});

	test('a fatal error while reading the standard input is not swallowed', async () => {
		textMock.mockRejectedValue(new TypeError('a bug'));
		await expect(run('-')).rejects.toThrow('a bug');
		expect(stderr).toStrictEqual([]);
	});

	test('a failing --init is reported on stderr and exits with 1', async () => {
		initializeMock.mockRejectedValue(new Error('install failed'));
		await expect(run('--init')).resolves.toBe(1);
		expect(stderr.join('')).toBe('Error: install failed\n');
	});

	test('a fatal error in --init is not swallowed', async () => {
		initializeMock.mockRejectedValue(new TypeError('a bug'));
		await expect(run('--init')).rejects.toThrow('a bug');
		expect(stderr).toStrictEqual([]);
	});

	test('a successful --init exits with 0', async () => {
		initializeMock.mockResolvedValue();
		await expect(run('--init')).resolves.toBe(0);
	});

	test('--create-rule exits with 1 and points to the other command on stderr', async () => {
		await expect(run('--create-rule')).resolves.toBe(1);
		expect(stderr.join('')).toContain('npx @markuplint/create-rule');
	});

	test('the `-` operand with --fix is rejected before the standard input is read', async () => {
		await expect(run('-', '--fix')).resolves.toBe(1);
		expect(stderr.join('')).toContain('--fix');
		expect(textMock).not.toHaveBeenCalled();
	});

	test.each([
		['a file path', ['a.html']],
		['the `-` operand', ['-']],
	])('a failure of the lint with %s is reported on stderr and exits with 1', async (_, args) => {
		textMock.mockResolvedValue('<div></div>');
		commandMock.mockRejectedValue(new Error('lint failed'));
		await expect(run(...args)).resolves.toBe(1);
		expect(stderr.join('')).toBe('Error: lint failed\n');
	});

	test.each([
		['a file path', ['a.html']],
		['the `-` operand', ['-']],
	])('a fatal error of the lint with %s is not swallowed', async (_, args) => {
		textMock.mockResolvedValue('<div></div>');
		commandMock.mockRejectedValue(new TypeError('a bug'));
		await expect(run(...args)).rejects.toThrow('a bug');
		expect(stderr).toStrictEqual([]);
	});

	test.each([
		[true, 1],
		[false, 0],
	])('the verdict %s of the lint is the exit code %s', async (hasError, exitCode) => {
		commandMock.mockResolvedValue(hasError);
		await expect(run('a.html')).resolves.toBe(exitCode);
	});
});
