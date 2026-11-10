/**
 * @module cli
 *
 * Convention: all error reporting in the CLI layer must go through
 * `process.stderr.write()` — never `console.warn`/`console.error`/
 * `console.log` — so stdout stays reserved for lint results
 * (e.g. `--format JSON` output that may be piped to other tools).
 *
 * The process ends by setting `process.exitCode` and returning from `main()`,
 * never by `process.exit()`. On POSIX a pipe is written asynchronously, and
 * `process.exit()` drops what is still queued: a report larger than the pipe
 * buffer reached `| jq` cut off at its first 128 KiB (#4554). Node.js says
 * `process.exit()` forces the exit "even if there are still asynchronous
 * operations pending that have not yet completed fully, including I/O
 * operations to `process.stdout`", and asks to "set the `process.exitCode`
 * and allow the process to exit naturally" instead
 * (https://nodejs.org/docs/latest-v24.x/api/process.html#processexitcode).
 * meow's own `--help` / `--version` handling calls `process.exit()` as well,
 * so it is turned off (`autoHelp` / `autoVersion` in `bootstrap.ts`) and done
 * here. Keep it that way: a new `process.exit()` in this layer brings the
 * truncation back for whatever it follows.
 *
 * Standard input is read in two ways. The `-` operand reads it whatever
 * stdout is (POSIX Utility Syntax Guidelines, Guideline 13: "the '-' operand
 * should be used to mean only standard input" for operands that represent
 * files to be opened for reading), which is what lets
 * `cat a.html | markuplint - --format json | jq` work with both ends piped.
 * With no operand it is read only when stdout is a TTY: without that
 * condition a parent that starts the CLI with no arguments and does not close
 * stdin (a child process spawned with an inherited, never-closed stdin) would
 * wait for it forever. An empty stdin is answered with the help and exit code
 * 1 in that case, and linted as an empty source with the `-` operand.
 * Neither way takes the options that act on a file (`--fix`, `--search` and the
 * suppressions options): there is no file to write or record for, and `--fix`
 * once created one named `<AnonymousFile>` (#4560). Both reject them before the
 * standard input is read, so an empty input gets that error, not the help.
 * `--fix-dry-run` is not among them: it writes nothing and only prints the diff.
 *
 * The flags that end the run early (`--help`, `--version`, `--init`,
 * `--create-rule`) are evaluated before the operands, so `-` next to them is
 * ignored. A failure that is not fatal (`isFatalError()`) is reported on stderr
 * with exit code 1; a fatal one is rethrown, and the top-level `await` ends the
 * process with exit code 1 and the stack.
 */

import { main } from './main.js';

process.exitCode = await main();
