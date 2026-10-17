import { existsSync } from 'node:fs';
import path from 'node:path';

import LernaScopes from '@commitlint/config-lerna-scopes';

/**
 * A commitlint rule that rejects a commit carrying a breaking-change marker — a `!` after
 * the type, or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer, which the parser turns
 * into one note alike — while the checkout is on the stable line.
 *
 * `yarn release` runs `lerna version --conventional-commits` on a fixed-version workspace:
 * one such commit since the last tag makes the next release of the stable line a major,
 * the number the next-major line owns (Branch Topology in the root `CLAUDE.md`). A change
 * to what an `@experimental` API or output does, and an approved exception for a stable
 * one, are described in a `Behavior change (…): …` paragraph of the body instead, which
 * conventional-changelog does not read as breaking (the `git` skill). Any other breaking
 * change is made on the next-major line, where the marker is the right thing to write.
 *
 * Only `always` is meaningful for this rule, so the `when` argument commitlint passes is
 * not read. The types are in `.commitlintrc.d.ts`, for the spec that exercises the factory.
 *
 * @param isStableLine - Whether the checkout is on the stable line
 * @returns The rule
 */
export function noBreakingChangeOnStableLine(isStableLine) {
	return parsed => {
		if (parsed.notes.length === 0 || !isStableLine()) {
			return [true];
		}
		return [
			false,
			'a `!` after the type or a `BREAKING CHANGE:` footer makes `yarn release` cut a major version from the stable line. Describe the change in a `Behavior change (experimental): …` paragraph of the body instead (`.claude/skills/git/SKILL.md`), or make it on the next-major line (`v6`).',
		];
	};
}

/**
 * The `crates/` directory exists only on the next-major line (`v6`): the criterion the root
 * `CLAUDE.md` tells the lines apart by. Its tracked `Cargo.toml` is what is looked up, not the
 * directory: switching a checkout from `v6` to `dev` leaves the ignored `crates/target/`
 * behind, and the directory alone would then pass for the next-major line. It is looked up
 * next to this file, so the answer is the same from every worktree and whichever directory
 * commitlint is run from.
 *
 * The criterion holds only while `crates/` marks the next-major line. Once `v6` is released
 * and becomes the stable line, every checkout has it and the rule is silent everywhere: the
 * switch-over list of the `release` skill says to re-key it then.
 */
const isStableLine = () => !existsSync(path.join(import.meta.dirname, 'crates', 'Cargo.toml'));

export default {
	extends: ['@commitlint/config-lerna-scopes', '@commitlint/config-conventional'],
	plugins: [
		{
			rules: {
				'no-breaking-change-on-stable-line': noBreakingChangeOnStableLine(isStableLine),
			},
		},
	],
	rules: {
		'scope-enum': async ctx => {
			const setting = await LernaScopes.rules['scope-enum'](ctx);
			const packages = setting[2].map(item => item.replaceAll(/-markuplint|markuplint-/gi, ''));
			return [
				setting[0],
				setting[1],
				[
					...packages,
					// Tags
					// `crates` covers the Rust workspace on the v6 line: those crates are not
					// Lerna packages, and stripping the `markuplint-` prefix would collide with
					// the JS package of the same name (`core`, `rules`, `types`, …).
					'crates',
					'release',
					'deps',
					'changelog',
					'github',
					'lint',
					'website',
				],
			];
		},
		'no-breaking-change-on-stable-line': [2, 'always'],
	},
};
