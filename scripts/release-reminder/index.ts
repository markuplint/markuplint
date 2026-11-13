/**
 * Opens, updates and closes the Issues that ask for a release of a line (`report.ts` decides when).
 *
 * Usage: `node --experimental-strip-types scripts/release-reminder/index.ts [--write] [--remote origin] [--now <ISO date>]`
 *
 * Without `--write` it only prints what it would do (and appends it to the job summary on GitHub
 * Actions), with the body of each Issue it would open, which is what a pull request run and a manual
 * dry run use; `--now` previews a later day. With `--write` it needs `gh`
 * authenticated for the repository (`GH_TOKEN`): one Issue per line, found by the marker on the first
 * line of its body; it is created when a release is due, its body is edited only when the report
 * changed, and it is closed once the line is no longer due, which happens when a release contains the
 * changes. The `experimental` line is not checked (`scripts/release-lines/lines.ts`).
 *
 * It reads the branches and tags of the remote from the local clone, so the clone needs the full
 * history and every tag (`fetch-depth: 0` on GitHub Actions).
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { Commit, Git, LineReport } from './report.ts';

import { RELEASE_LINES } from '../release-lines/lines.ts';

import { checkLine, marker, renderIssue } from './report.ts';

const { values } = parseArgs({
	options: {
		write: { type: 'boolean', default: false },
		remote: { type: 'string', default: 'origin' },
		now: { type: 'string' },
	},
});

const repository = process.env.GITHUB_REPOSITORY ?? 'markuplint/markuplint';

function run(command: string, args: readonly string[]): string {
	return execFileSync(command, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function parseCommits(output: string): readonly Commit[] {
	return output
		.split('\n')
		.filter(Boolean)
		.map(row => {
			const [sha = '', time = '0', ...subject] = row.split('\t');
			return { sha, time: Number(time), subject: subject.join('\t') };
		});
}

const git: Git = {
	tags: ref => run('git', ['tag', '--merged', ref]).split('\n').filter(Boolean),
	diffNames: (from, to, dir) => run('git', ['diff', '--name-only', from, to, '--', dir]).split('\n').filter(Boolean),
	show: (rev, file) => {
		try {
			return execFileSync('git', ['show', `${rev}:${file}`], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			});
		} catch {
			return null;
		}
	},
	listFiles: (rev, dir) => run('git', ['ls-tree', '-r', '--name-only', rev, '--', dir]).split('\n').filter(Boolean),
	firstParents: (from, to) =>
		parseCommits(run('git', ['log', '--first-parent', '--reverse', '--format=%H%x09%ct%x09%s', `${from}..${to}`])),
	commits: (from, to) => parseCommits(run('git', ['log', '--reverse', '--format=%H%x09%ct%x09%s', `${from}..${to}`])),
};

const now = values.now === undefined ? Date.now() : Date.parse(values.now);
if (Number.isNaN(now)) {
	throw new TypeError(`--now is not a date: ${values.now}`);
}
const reports: { report: LineReport; branch: string }[] = RELEASE_LINES.filter(
	line => line.role !== 'experimental',
).map(line => ({
	branch: line.branch,
	report: checkLine(git, { major: line.major, role: line.role, branch: `${values.remote}/${line.branch}` }, now),
}));

const summary: string[] = ['## Release reminder', ''];
for (const { report, branch } of reports) {
	const state = report.due
		? 'release due'
		: report.packages.length > 0
			? `unreleased changes, not due yet (oldest landed ${new Date((report.carriers[0]?.time ?? 0) * 1000).toISOString()})`
			: 'nothing unreleased';
	summary.push(
		`- \`${branch}\` (v${report.major}, ${report.role}) since \`${report.baseline ?? 'no release'}\`: ${state}`,
	);
	for (const { name, changes } of report.packages) {
		summary.push(`  - \`${name}\`: ${changes.join(', ')}`);
	}
}
if (!values.write) {
	for (const { report, branch } of reports.filter(({ report }) => report.due)) {
		const { title, body } = renderIssue(report, repository, branch);
		summary.push('', `### Issue for \`${branch}\`: ${title}`, '', '````markdown', body, '````');
	}
}
const text = `${summary.join('\n')}\n`;
process.stdout.write(text);
if (process.env.GITHUB_STEP_SUMMARY) {
	appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
}

if (values.write) {
	const open = JSON.parse(
		run('gh', ['issue', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,body']),
	) as {
		number: number;
		title: string;
		body: string;
	}[];
	const scratch = mkdtempSync(path.join(tmpdir(), 'release-reminder-'));
	for (const { report, branch } of reports) {
		const existing = open.find(issue => issue.body.startsWith(marker(report.major)));
		if (!report.due) {
			if (existing) {
				const reason =
					report.packages.length === 0
						? `\`${report.baseline}\` contains every change`
						: `\`${report.baseline}\` was released since`;
				run('gh', [
					'issue',
					'close',
					String(existing.number),
					'--comment',
					`No release is due on \`${branch}\`: ${reason}.`,
				]);
				process.stdout.write(`Closed #${existing.number}\n`);
			}
			continue;
		}
		const { title, body } = renderIssue(report, repository, branch);
		const file = path.join(scratch, `v${report.major}.md`);
		writeFileSync(file, body);
		if (existing) {
			if (existing.body.trim() !== body.trim() || existing.title !== title) {
				run('gh', ['issue', 'edit', String(existing.number), '--title', title, '--body-file', file]);
				process.stdout.write(`Updated #${existing.number}\n`);
			}
			continue;
		}
		let url: string;
		try {
			url = run('gh', ['issue', 'create', '--title', title, '--label', `v${report.major}`, '--body-file', file]);
		} catch {
			// A missing label must not lose the reminder.
			url = run('gh', ['issue', 'create', '--title', title, '--body-file', file]);
		}
		process.stdout.write(`Created ${url.trim()}\n`);
	}
}
