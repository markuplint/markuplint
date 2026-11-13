/**
 * The major lines this repository maintains, and the one place that says which branch carries
 * which major in which role. `consistency.spec.ts` beside this file fails when a configuration
 * that names a branch (Renovate, the PR labeler, the commit guard, the workflow triggers, the
 * Branch Topology table of the root `CLAUDE.md`, the support policy page of the website) disagrees
 * with it, so that the configurations change together when the lines rotate.
 *
 * ## Roles
 *
 * Two majors are supported at a time: the newest stable major and the one before it. A third line
 * carries the next major while it is developed.
 *
 * | Role           | What the line receives                                     | Renovate                                                                                                                       | Release reminder                     |
 * | -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
 * | `stable`       | Features, fixes, dependency updates                        | Development-only updates (GitHub Actions, `devDependencies`) and `dependencies` minor / patch automerge after the 7-day `minimumReleaseAge`; a `dependencies` major waits for the owner | Yes                                  |
 * | `lts`          | Vulnerability fixes only                                   | Vulnerability fixes and lock file maintenance only (a vulnerability fix that needs a major waits for the owner)               | Yes                                  |
 * | `experimental` | The next major: breaking changes are allowed               | The same as `stable`                                                                                                           | No, until it becomes `stable`        |
 *
 * Why the roles differ:
 *
 * - `lts` keeps the dependency ranges and Node.js support its users installed it with, so it takes
 *   no regular update; it pins exact versions, so a vulnerability fix reaches users only through a
 *   release, which is why the release reminder covers it.
 * - The release reminder (`scripts/release-reminder/`) asks for a release when a line's branch has
 *   held a change that reaches npm users for more than three days. An `experimental` line has no
 *   release cadence to keep, so it is left out until it is promoted.
 * - Vulnerability fixes skip `minimumReleaseAge` on every line; everything else waits seven days.
 *
 * The per-rule reasons of the Renovate configuration are in the `description` fields of
 * `.github/renovate.json`; the user-facing statement of this policy is
 * `website/community/support-policy.mdx`.
 *
 * ## Branches
 *
 * `dev` always carries the `stable` line, and stable releases are cut on `main` after `dev` is
 * merged into it. The `lts` and `experimental` lines live on a branch named `v<major>`; an `lts`
 * release is cut on its own branch, and an `experimental` line is released, if at all, from a
 * prerelease branch cut from it (the `release` skill).
 *
 * ## Rotation
 *
 * When the `experimental` major is released as stable, every role moves one step: the `lts` line
 * ends (its branch stays, and it leaves this list), the `stable` line becomes `lts` on a new
 * `v<major>` branch, the `experimental` line becomes `stable` on `dev`, and the next major becomes
 * `experimental` once work on it starts. The `major-rotation` skill is the procedure: it starts by
 * editing this list, and `consistency.spec.ts` then names the configurations that still follow the
 * old lines.
 */

export type ReleaseRole = 'stable' | 'lts' | 'experimental';

export interface ReleaseLine {
	/** The major version the line publishes. */
	readonly major: number;
	readonly role: ReleaseRole;
	/** The branch that pull requests and Renovate target for this line. */
	readonly branch: string;
}

export const RELEASE_LINES: readonly ReleaseLine[] = [
	{ major: 4, role: 'lts', branch: 'v4' },
	{ major: 5, role: 'stable', branch: 'dev' },
	{ major: 6, role: 'experimental', branch: 'v6' },
];

/**
 * @param role - The role to look for
 * @returns The lines that have the role, oldest major first
 */
export function linesWithRole(role: ReleaseRole): readonly ReleaseLine[] {
	return RELEASE_LINES.filter(line => line.role === role);
}
