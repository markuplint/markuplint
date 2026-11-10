// `main()` is called in-process so that the branches a spawned process cannot reach (a failing
// standard input, a failing `--init`) are covered. `bootstrap.ts` parses `process.argv` as it is
// imported, so every test sets the arguments and loads the modules afresh.
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';

const textMock = vi.fn<() => Promise<string>>();
const initializeMock = vi.fn<() => Promise<void>>();
const commandMock = vi.fn<(...args: unknown[]) => Promise<boolean>>();

vi.mock('node:stream/consumers', () => ({ text: () => textMock() }));
vi.mock('./init/index.js', () => ({ initialize: () => initializeMock() }));
vi.mock('./command.js', () => ({ command: (...args: unknown[]) => commandMock(...args) }));

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

	// The options that `givenFileFlags()` in `main.ts` lists: they act on a file (write it, or
	// record something for it), and the standard input has none. Keep the two in step.
	const FILE_FLAGS: readonly (readonly [string, readonly string[]])[] = [
		['--fix', ['--fix']],
		['--search', ['--search', 'div']],
		['--suppress', ['--suppress']],
		['--suppress-rule', ['--suppress-rule', 'attr-value-quotes']],
		['--prune-suppressions', ['--prune-suppressions']],
	];

	// `--fix` with the `-` operand is the test above.
	test.each(FILE_FLAGS.filter(([flag]) => flag !== '--fix'))(
		'the `-` operand with %s is rejected before the standard input is read',
		async (flag, flagArgs) => {
			await expect(run('-', ...flagArgs)).resolves.toBe(1);
			expect(stderr.join('')).toBe(`The \`-\` operand (standard input) cannot be combined with ${flag}.\n`);
			expect(textMock).not.toHaveBeenCalled();
			expect(commandMock).not.toHaveBeenCalled();
		},
	);

	test('the `-` operand names every file option and the file paths that it is combined with', async () => {
		await expect(run('-', 'a.html', '--fix', '--suppress')).resolves.toBe(1);
		expect(stderr.join('')).toBe(
			'The `-` operand (standard input) cannot be combined with file paths, --fix, --suppress.\n',
		);
	});

	test('the `-` operand with a second file path alone names only the file paths', async () => {
		await expect(run('-', 'a.html')).resolves.toBe(1);
		expect(stderr.join('')).toBe('The `-` operand (standard input) cannot be combined with file paths.\n');
	});

	test('the `-` operand with --fix-dry-run and --suppress names only --suppress', async () => {
		await expect(run('-', '--fix-dry-run', '--suppress')).resolves.toBe(1);
		expect(stderr.join('')).toBe('The `-` operand (standard input) cannot be combined with --suppress.\n');
	});

	test('the `-` operand with --fix-dry-run writes nothing, so it is linted', async () => {
		textMock.mockResolvedValue('<div id=x></div>');
		commandMock.mockResolvedValue(false);
		await expect(run('-', '--fix-dry-run')).resolves.toBe(0);
		expect(commandMock).toHaveBeenCalledOnce();
		expect(commandMock.mock.calls[0]?.[1]).toMatchObject({ fixDryRun: true, fix: false });
	});

	test('the `-` operand with an empty --search is no search, as it is with a file path, so it is linted', async () => {
		textMock.mockResolvedValue('<div id=x></div>');
		commandMock.mockResolvedValue(false);
		await expect(run('-', '--search', '')).resolves.toBe(0);
		expect(commandMock).toHaveBeenCalledOnce();
	});

	test('the `-` operand with an empty --suppress-rule is rejected, as `command()` takes it for the suppressions mode', async () => {
		await expect(run('-', '--suppress-rule', '')).resolves.toBe(1);
		expect(stderr.join('')).toBe('The `-` operand (standard input) cannot be combined with --suppress-rule.\n');
	});

	describe('standard input with no operand (a pipe in, a terminal out)', () => {
		const originalStdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
		const originalStdoutIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

		function setIsTTY(stream: NodeJS.ReadStream | NodeJS.WriteStream, value: boolean) {
			Object.defineProperty(stream, 'isTTY', { value, configurable: true, writable: true });
		}

		function restoreIsTTY(stream: NodeJS.ReadStream | NodeJS.WriteStream, original?: PropertyDescriptor) {
			if (original) {
				Object.defineProperty(stream, 'isTTY', original);
			} else {
				// `isTTY` is absent on a stream that is not a TTY; put it back as it was.
				Reflect.deleteProperty(stream, 'isTTY');
			}
		}

		beforeEach(() => {
			setIsTTY(process.stdin, false);
			setIsTTY(process.stdout, true);
		});

		afterEach(() => {
			restoreIsTTY(process.stdin, originalStdinIsTTY);
			restoreIsTTY(process.stdout, originalStdoutIsTTY);
		});

		test('is linted as a source', async () => {
			textMock.mockResolvedValue('<div></div>');
			commandMock.mockResolvedValue(false);
			await expect(run()).resolves.toBe(0);
			expect(commandMock).toHaveBeenCalledOnce();
		});

		test.each(FILE_FLAGS)('with %s is rejected before the standard input is read', async (flag, flagArgs) => {
			textMock.mockResolvedValue('<div id=x></div>');
			await expect(run(...flagArgs)).resolves.toBe(1);
			expect(stderr.join('')).toBe(`Standard input cannot be combined with ${flag}.\n`);
			expect(textMock).not.toHaveBeenCalled();
			expect(commandMock).not.toHaveBeenCalled();
		});

		test('an empty input with --fix is rejected, not answered with the help', async () => {
			textMock.mockResolvedValue('');
			await expect(run('--fix')).resolves.toBe(1);
			expect(stderr.join('')).toBe('Standard input cannot be combined with --fix.\n');
		});

		test('several options are named in the order of the list', async () => {
			await expect(run('--fix', '--search', 'div')).resolves.toBe(1);
			expect(stderr.join('')).toBe('Standard input cannot be combined with --search, --fix.\n');
		});

		test('--fix-dry-run writes nothing, so it is linted', async () => {
			textMock.mockResolvedValue('<div id=x></div>');
			commandMock.mockResolvedValue(false);
			await expect(run('--fix-dry-run')).resolves.toBe(0);
			expect(commandMock).toHaveBeenCalledOnce();
			expect(commandMock.mock.calls[0]?.[1]).toMatchObject({ fixDryRun: true, fix: false });
		});

		test('--suppressions-location only names a path, so it is linted', async () => {
			textMock.mockResolvedValue('<div id=x></div>');
			commandMock.mockResolvedValue(false);
			await expect(run('--suppressions-location', 'x.json')).resolves.toBe(0);
			expect(commandMock).toHaveBeenCalledOnce();
		});
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
