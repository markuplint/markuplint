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
					'release',
					'deps',
					'changelog',
					'github',
					'lint',
					'website',
					'playground',
				],
			];
		},
	},
};
