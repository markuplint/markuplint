#!/usr/bin/env node

/**
 * The carry-over ledger of a pull request: the `## Not covered here` section
 * of its body.
 *
 * Usage:
 *   node .claude/skills/impl/scripts/leftovers.mjs status <pr-number-or-url>
 *   node .claude/skills/impl/scripts/leftovers.mjs mark <pr-number-or-url> <index> "<marker>" [--dry-run]
 *
 * `status` prints the PR's state and, numbered from 1, the bullets of the
 * section whose last line carries no marker. `mark` appends ` — <marker>` to
 * the last line of the bullet at <index> (a number from the `status`
 * listing), writes the body back with `gh pr edit --body-file`, and prints
 * what `status` prints afterwards. `<marker>` is `Filed as #<n>` or
 * `Not filed: <reason>`; nothing else is accepted, so the only ways out of
 * the ledger are an issue or a recorded decision of the user. `--dry-run`
 * prints the new body instead of writing it. Any other or extra argument is
 * an error and nothing is written: a misspelt flag must not turn a rehearsal
 * into a write.
 *
 * WHY the ledger is the PR body: it is the one place that survives `/clear`,
 * context compaction and the removal of the worktree, and the maintainer reads
 * it on GitHub. The `impl` skill writes the section with every bullet already
 * marked `Filed as #n` before the commit; after the merge, its last step runs
 * `status` until it prints `(none)`, which catches a bullet that slipped
 * through or was added to the body during review.
 *
 * An error is printed as a line starting with `error:` and exits with 1;
 * `mark` writes nothing in that case.
 *
 * WHY the body is patched one line at a time: regenerating the body from the
 * model is the step most likely to drop another section (`## Left as is on
 * purpose`, the generated-with footer) or to reflow a bullet. The script
 * changes exactly one line, keeps the body's own line ending, and leaves
 * every other byte as it was.
 *
 * WHY a section with text but no bullet at all is a warning, not `(none)`:
 * `(none)` is the loop's only end condition, so a section written in a form
 * the script does not read (prose, a table) must not look finished. Prose
 * next to bullets (an introductory line) is normal and raises no warning.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SECTION_HEADING = /^## Not covered here\s*$/;
const SECTION_END = /^(## |🤖)/;
const BULLET = /^(?:[-*+]|\d+\.) /;
const CONTINUATION = /^\s+\S/;
const FENCE = /^\s*(```|~~~)/;
const MARKED_LAST_LINE = /(?:—\s*)?(?:Filed as #\d+|Not filed: .*?)\.?\s*$/;
const MARKER = /^(Filed as #\d+|Not filed: \S.*)$/;
const NONE = /^None\.?$/;

const args = process.argv.slice(2);
const [command] = args;

try {
	if (command === 'status' && args.length === 2) {
		console.log(status(fetchPr(args[1])));
	} else if (command === 'mark' && (args.length === 4 || (args.length === 5 && args[4] === '--dry-run'))) {
		console.log(mark(args[1], args[2], args[3], args.length === 5));
	} else {
		console.log(
			'error: usage: leftovers.mjs status <pr-number> | mark <pr-number> <index> "<marker>" [--dry-run] (no other arguments are accepted)',
		);
		process.exitCode = 1;
	}
} catch (error) {
	console.log(`error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}

/**
 * @param {string | undefined} prArg
 */
function prNumberOf(prArg) {
	if (prArg === undefined || prArg.trim() === '') {
		throw new Error('no PR number given (usage: leftovers.mjs status <pr-number>)');
	}
	const match = prArg.trim().match(/^(?:https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/)?(\d+)\/?$/);
	if (!match) {
		throw new Error(`"${prArg}" is not a PR number or a PR URL`);
	}
	return match[1];
}

/**
 * @param {string | undefined} prArg
 */
function fetchPr(prArg) {
	const prNumber = prNumberOf(prArg);
	const json = gh(['pr', 'view', prNumber, '--json', 'number,state,mergedAt,baseRefName,author,body']);
	const data = JSON.parse(json);
	const body = String(data.body ?? '');
	const eol = body.includes('\r\n') ? '\r\n' : '\n';
	return { ...data, prNumber, eol, lines: body.split(/\r?\n/) };
}

/**
 * @param {string[]} args
 */
function gh(args) {
	try {
		return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	} catch (error) {
		const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr).trim() : '';
		throw new Error(`gh ${args.slice(0, 3).join(' ')} failed${stderr ? `: ${stderr.split('\n')[0]}` : ''}`);
	}
}

/**
 * Read the section. A bullet starts at a line beginning with a list marker in
 * column 0 and owns the indented lines that follow it (continuation lines,
 * nested bullets); a column-0 line that is not a bullet ends it. Lines inside
 * a fenced code block neither start a bullet nor end the section.
 *
 * @param {string[]} lines
 * @returns {{ found: boolean, bullets: { end: number, text: string }[], otherText: boolean }}
 */
function section(lines) {
	const headingAt = lines.findIndex(line => SECTION_HEADING.test(line));
	if (headingAt === -1) {
		return { found: false, bullets: [], otherText: false };
	}
	const bullets = [];
	let current = null;
	let otherText = false;
	let inFence = false;
	for (let i = headingAt + 1; i < lines.length; i++) {
		const line = lines[i];
		if (FENCE.test(line)) {
			inFence = !inFence;
		}
		if (!inFence && SECTION_END.test(line)) {
			break;
		}
		if (!inFence && BULLET.test(line)) {
			current = { end: i, parts: [line.replace(BULLET, '')] };
			bullets.push(current);
		} else if (current && CONTINUATION.test(line)) {
			current.end = i;
			current.parts.push(line.trim());
		} else if (line.trim() !== '') {
			current = null;
			if (!NONE.test(line.trim())) {
				otherText = true;
			}
		}
	}
	return { found: true, bullets: bullets.map(b => ({ end: b.end, text: b.parts.join(' ') })), otherText };
}

/**
 * @param {ReturnType<typeof fetchPr>} data
 */
function unfiled(data) {
	return section(data.lines).bullets.filter(item => !MARKED_LAST_LINE.test(data.lines[item.end]));
}

/**
 * @param {ReturnType<typeof fetchPr>} data
 */
function status(data) {
	const merged = data.state === 'MERGED' ? `MERGED at ${data.mergedAt}` : data.state;
	const head = `PR #${data.number}: ${merged}, base ${data.baseRefName}, author ${data.author?.login ?? '?'}`;
	const parsed = section(data.lines);
	const items = unfiled(data);
	const list = items.map((item, i) => `${i + 1}. ${item.text}`).join('\n');
	if (parsed.bullets.length === 0 && parsed.otherText) {
		return `${head}\nUnfiled leftovers:\nwarning: "## Not covered here" has text but no bullet the script reads; read the section yourself`;
	}
	if (items.length === 0) {
		return `${head}\nUnfiled leftovers:\n(none)`;
	}
	return `${head}\nUnfiled leftovers:\n${list}`;
}

/**
 * @param {string | undefined} prArg
 * @param {string | undefined} indexArg
 * @param {string | undefined} markerArg
 * @param {boolean} dryRun
 */
function mark(prArg, indexArg, markerArg, dryRun) {
	if (!MARKER.test(markerArg ?? '')) {
		throw new Error('the marker must be "Filed as #<n>" or "Not filed: <reason>"');
	}
	const data = fetchPr(prArg);
	const items = unfiled(data);
	const position = Number(indexArg);
	if (!Number.isInteger(position) || position < 1 || position > items.length) {
		throw new Error(`index ${indexArg} is not in 1..${items.length} of the unfiled list`);
	}
	const target = items[position - 1];
	const lines = [...data.lines];
	if (FENCE.test(lines[target.end])) {
		// Text after a closing fence would keep the fence open (CommonMark), so the
		// marker goes on its own indented line, which stays part of the bullet.
		const indent = lines[target.end].match(/^\s*/)[0] || '  ';
		lines.splice(target.end + 1, 0, `${indent}— ${markerArg}`);
	} else {
		lines[target.end] = `${lines[target.end]} — ${markerArg}`;
	}
	const body = lines.join(data.eol);
	if (dryRun) {
		return `dry-run: body not written\n${body}`;
	}
	const dir = mkdtempSync(join(tmpdir(), 'leftovers-'));
	try {
		const file = join(dir, 'body.md');
		writeFileSync(file, body);
		gh(['pr', 'edit', data.prNumber, '--body-file', file]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
	return status(fetchPr(data.prNumber));
}
