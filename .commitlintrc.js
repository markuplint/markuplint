import LernaScopes from '@commitlint/config-lerna-scopes';

export default {
	extends: ['@commitlint/config-lerna-scopes', '@commitlint/config-conventional'],
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
	},
};
