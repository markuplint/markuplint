/**
 * Decides, for one release line, whether its branch holds changes that reach npm users and are not
 * in a release yet, and since when. `index.ts` turns the answer into a GitHub Issue that asks for a
 * release once the oldest such change has waited `DUE_AFTER_MS`, so that a fix merged into a line
 * (a vulnerability fix on the `lts` line above all: it pins exact versions, so nothing reaches its
 * users without a release) is not left unreleased.
 *
 * What counts is decided per public package, against the newest stable `v<major>.x.y` tag the
 * branch contains:
 *
 * - A file that `npm pack` ships (not matched by the package's `.npmignore`), or a build input
 *   under `src/`, other than Markdown, specs and test data. Documentation, tests and the files a
 *   package leaves out of its tarball change nothing users install.
 * - In `package.json`, the fields that change what a consumer resolves or loads
 *   (`PACKAGE_FIELDS`). `version` and `devDependencies` are left out.
 * - `yarn.lock` is not a package file: consumers resolve their own dependencies.
 *
 * The baseline is the highest version, not the nearest tag: `git describe` (and `lerna changed`,
 * which adds `--first-parent`) picks the nearest, and on `dev` the release tag is reachable only
 * through the second parent of the merge that brings `main` back after a release.
 *
 * The clock starts at the first-parent commit of the branch that brought in one of the counted
 * changes, which is when the change landed on the branch (a commit's own date can be older). Only a
 * change still present in the cumulative diff counts, so the merge that brings a release back into
 * `dev` (it bumps `version`, the changelog and the exact pins of the sibling packages, all of which
 * the tag already has) does not start the clock.
 */

export const DUE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/** The `package.json` fields whose change reaches a consumer. */
export const PACKAGE_FIELDS = [
	'dependencies',
	'peerDependencies',
	'peerDependenciesMeta',
	'optionalDependencies',
	'engines',
	'bin',
	'exports',
	'main',
	'module',
	'types',
	'type',
	'files',
] as const;

export interface Commit {
	readonly sha: string;
	/** Committer time, in seconds since the epoch. */
	readonly time: number;
	readonly subject: string;
}

/** Read access to the repository. Paths are relative to its root. */
export interface Git {
	/** The tags that `ref` contains. */
	tags(ref: string): readonly string[];
	/** The files that differ between two revisions, under `path`. */
	diffNames(from: string, to: string, path: string): readonly string[];
	/** The content of a file at a revision, or `null` if it does not exist there. */
	show(rev: string, path: string): string | null;
	/** Every file at a revision, under `path`. */
	listFiles(rev: string, path: string): readonly string[];
	/** The first-parent commits in `from..to`, oldest first. */
	firstParents(from: string, to: string): readonly Commit[];
	/** Every commit in `from..to`, oldest first. */
	commits(from: string, to: string): readonly Commit[];
}

export interface PackageChange {
	readonly name: string;
	/** Changed files, relative to the package, and `package.json#<field>[.<key>]` entries. */
	readonly changes: readonly string[];
}

export interface LineReport {
	readonly major: number;
	readonly branch: string;
	readonly role: string;
	/** The newest stable release the branch contains; `null` when the line has none. */
	readonly baseline: string | null;
	readonly packages: readonly PackageChange[];
	/** The first-parent commits that brought in a counted change, oldest first. */
	readonly carriers: readonly Commit[];
	/** Commits since the baseline whose subject marks a vulnerability fix (Renovate's `[security]`). */
	readonly securityFixes: readonly Commit[];
	/** Whether the oldest carrier has waited `DUE_AFTER_MS`. */
	readonly due: boolean;
}

const STABLE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/**
 * @param tags - Tag names
 * @param major - The major of the line
 * @returns The highest `v<major>.x.y` tag without a prerelease part, or `null`
 */
export function newestRelease(tags: readonly string[], major: number): string | null {
	let best: { tag: string; version: readonly number[] } | null = null;
	for (const tag of tags) {
		const match = STABLE_TAG.exec(tag);
		if (!match || Number(match[1]) !== major) {
			continue;
		}
		const version = [Number(match[1]), Number(match[2]), Number(match[3])];
		if (!best || compare(version, best.version) > 0) {
			best = { tag, version };
		}
	}
	return best?.tag ?? null;
}

function compare(a: readonly number[], b: readonly number[]): number {
	for (const [index, value] of a.entries()) {
		const diff = value - (b[index] ?? 0);
		if (diff !== 0) {
			return diff;
		}
	}
	return 0;
}

interface IgnoreRule {
	readonly negate: boolean;
	readonly pattern: RegExp;
}

/**
 * Compiles `.npmignore` lines with the `.gitignore` semantics npm applies: a pattern without an
 * inner slash matches a name at any depth, a trailing slash matches a directory only, the last
 * matching line wins.
 *
 * @param source - The content of an `.npmignore`
 * @returns A predicate that tells whether a path relative to the package is left out of the tarball
 */
export function npmIgnore(source: string): (path: string) => boolean {
	const rules: IgnoreRule[] = [];
	for (const raw of source.split('\n')) {
		const line = raw.trim();
		if (line === '' || line.startsWith('#')) {
			continue;
		}
		const negate = line.startsWith('!');
		let body = negate ? line.slice(1) : line;
		const directoryOnly = body.endsWith('/');
		body = body.replace(/\/+$/, '');
		const anchored = body.includes('/');
		body = body.replace(/^\/+/, '');
		const glob = body
			.split('**')
			.map(part =>
				part
					.split('*')
					.map(piece => piece.replaceAll(/[.+^${}()|[\]\\?]/g, '\\$&'))
					.join('[^/]*'),
			)
			.join('.*');
		const tail = directoryOnly ? '/.*' : '(?:/.*)?';
		rules.push({ negate, pattern: new RegExp(`${anchored ? '^' : '(?:^|/)'}${glob}${tail}$`) });
	}
	return path => {
		let ignored = false;
		for (const rule of rules) {
			if (rule.pattern.test(path)) {
				ignored = !rule.negate;
			}
		}
		return ignored;
	};
}

const NOT_SHIPPED_CONTENT = [/\.md$/i, /\.spec\.[cm]?[jt]sx?$/, /(?:^|\/)(?:__snapshots__|__mocks__|fixtures?|test)\//];

interface PublicPackage {
	readonly root: string;
	readonly name: string;
	readonly ignored: (path: string) => boolean;
}

function publicPackages(git: Git, rev: string): readonly PublicPackage[] {
	return git
		.listFiles(rev, 'packages')
		.filter(file => /^packages\/(?:@[^/]+\/)?[^/]+\/package\.json$/.test(file))
		.flatMap(file => {
			const manifest = JSON.parse(git.show(rev, file) ?? '{}') as { name?: string; private?: boolean };
			if (manifest.private === true || !manifest.name) {
				return [];
			}
			const root = file.slice(0, -'/package.json'.length);
			return [{ root, name: manifest.name, ignored: npmIgnore(git.show(rev, `${root}/.npmignore`) ?? '') }];
		});
}

/**
 * @param before - `package.json` at the older revision, or `null`
 * @param after - `package.json` at the newer revision, or `null`
 * @returns `package.json#<field>` for a changed scalar field, `package.json#<field>.<key>` for a
 * changed entry of an object field, limited to `PACKAGE_FIELDS`
 */
export function manifestChanges(before: string | null, after: string | null): readonly string[] {
	const a = JSON.parse(before ?? '{}') as Record<string, unknown>;
	const b = JSON.parse(after ?? '{}') as Record<string, unknown>;
	const changes: string[] = [];
	for (const field of PACKAGE_FIELDS) {
		const x = a[field];
		const y = b[field];
		if (isRecord(x) || isRecord(y)) {
			const xs = isRecord(x) ? x : {};
			const ys = isRecord(y) ? y : {};
			for (const key of [...new Set([...Object.keys(xs), ...Object.keys(ys)])].toSorted()) {
				if (JSON.stringify(xs[key]) !== JSON.stringify(ys[key])) {
					changes.push(`package.json#${field}.${key}`);
				}
			}
		} else if (JSON.stringify(x) !== JSON.stringify(y)) {
			changes.push(`package.json#${field}`);
		}
	}
	return changes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The counted changes between two revisions, as `<package root>/<change>` keys.
 */
function countedChanges(git: Git, packages: readonly PublicPackage[], from: string, to: string): Set<string> {
	const keys = new Set<string>();
	for (const file of git.diffNames(from, to, 'packages')) {
		const pkg = packages.find(({ root }) => file.startsWith(`${root}/`));
		if (!pkg) {
			continue;
		}
		const rel = file.slice(pkg.root.length + 1);
		if (rel === 'package.json') {
			for (const change of manifestChanges(git.show(from, file), git.show(to, file))) {
				keys.add(`${pkg.root}/${change}`);
			}
			continue;
		}
		if (NOT_SHIPPED_CONTENT.some(pattern => pattern.test(rel))) {
			continue;
		}
		if (rel.startsWith('src/') || !pkg.ignored(rel)) {
			keys.add(`${pkg.root}/${rel}`);
		}
	}
	return keys;
}

/**
 * @param git - Read access to the repository
 * @param line - The line to check
 * @param line.major - Its major version
 * @param line.branch - The ref of its branch (e.g. `origin/v4`)
 * @param line.role - Its role, carried into the report
 * @param now - The current time, in milliseconds since the epoch
 * @returns What is unreleased on the line, and whether a release is due
 */
export function checkLine(
	git: Git,
	line: { readonly major: number; readonly branch: string; readonly role: string },
	now: number,
): LineReport {
	const baseline = newestRelease(git.tags(line.branch), line.major);
	const empty = { ...line, baseline, packages: [], carriers: [], securityFixes: [], due: false };
	if (baseline === null) {
		return empty;
	}
	const packages = publicPackages(git, line.branch);
	const cumulative = countedChanges(git, packages, baseline, line.branch);
	if (cumulative.size === 0) {
		return empty;
	}

	const carriers = git.firstParents(baseline, line.branch).filter(commit => {
		const own = countedChanges(git, packages, `${commit.sha}^1`, commit.sha);
		return [...own].some(key => cumulative.has(key));
	});

	const byPackage = new Map<string, string[]>();
	for (const key of [...cumulative].toSorted()) {
		const pkg = packages.find(({ root }) => key.startsWith(`${root}/`));
		if (pkg) {
			byPackage.set(pkg.name, [...(byPackage.get(pkg.name) ?? []), key.slice(pkg.root.length + 1)]);
		}
	}

	const oldest = carriers[0];
	return {
		...line,
		baseline,
		packages: [...byPackage].map(([name, changes]) => ({ name, changes })),
		carriers,
		securityFixes: git.commits(baseline, line.branch).filter(commit => /\[security\]/i.test(commit.subject)),
		due: oldest !== undefined && now - oldest.time * 1000 >= DUE_AFTER_MS,
	};
}

/**
 * @param line - The major of the line
 * @returns The first line of an Issue body that identifies the reminder for the line
 */
export function marker(line: number): string {
	return `<!-- release-reminder:v${line} -->`;
}

/**
 * @param report - A report whose `due` is `true`
 * @param repository - `<owner>/<name>` on GitHub
 * @param branchName - The branch name without the remote (`v4`, `dev`)
 * @returns The title and the body of the Issue that asks for a release
 */
export function renderIssue(
	report: LineReport,
	repository: string,
	branchName: string,
): { readonly title: string; readonly body: string } {
	const oldest = report.carriers[0];
	const date = (commit: Commit) => new Date(commit.time * 1000).toISOString().slice(0, 10);
	const list = (commits: readonly Commit[]) => [
		'~~~',
		...commits.map(commit => `${commit.sha.slice(0, 9)} ${date(commit)} ${commit.subject}`),
		'~~~',
	];
	const howTo =
		report.role === 'lts'
			? `a maintenance release on \`${branchName}\` itself`
			: `a stable release: merge \`${branchName}\` into \`main\` and release there`;
	const lines = [
		marker(report.major),
		'',
		`\`${branchName}\` (v${report.major}, ${report.role}) has changes that reach npm users and are not in a release. The oldest landed on ${oldest ? date(oldest) : '?'}, more than three days ago.`,
		'',
		`- Latest release: \`${report.baseline}\``,
		`- Unreleased: https://github.com/${repository}/compare/${report.baseline}...${branchName}`,
		'',
	];
	if (report.securityFixes.length > 0) {
		lines.push(
			`### Vulnerability fixes merged since \`${report.baseline}\``,
			'',
			'Some may touch only development dependencies; the changed packages below are what reaches users.',
			'',
			...list(report.securityFixes),
			'',
		);
	}
	lines.push(
		'### Changed packages',
		'',
		...report.packages.map(
			({ name, changes }) => `- \`${name}\`: ${changes.map(change => `\`${change}\``).join(', ')}`,
		),
		'',
		'### Commits that brought them in',
		'',
		...list(report.carriers),
		'',
		`Cut ${howTo}, with the \`release\` skill. This Issue closes by itself once a release contains these changes.`,
		'',
	);
	return {
		title: `Release v${report.major}: changes since ${report.baseline} are not published`,
		body: lines.join('\n'),
	};
}
