/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
	rules: {
		'sort-class-members/sort-class-members': [
			1,
			{
				order: [
					'[static-properties]',
					'[static-methods]',
					'[properties]',
					'[conventional-private-properties]',
					'constructor',
					'[accessor-pairs]',
					'[perser-methods-main]',
					'[perser-methods-visit]',
					'[perser-methods-update]',
					'[perser-methods-detection]',
					'[perser-methods-creation]',
					'[perser-methods-manipurate]',
					'[other-methods]',
					'[conventional-private-methods]',
					'[other-native-private-methods]',
				],
				groups: {
					'perser-methods-main': [
						{ name: 'tokenize', type: 'method' },
						{ name: 'beforeParse', type: 'method' },
						{ name: 'parse', type: 'method' },
						{ name: 'afterParse', type: 'method' },
						{ name: 'parseError', type: 'method' },
						{ name: 'traverse', type: 'method' },
						{ name: 'afterTraverse', type: 'method' },
						{ name: 'nodeize', type: 'method' },
						{ name: 'afterNodeize', type: 'method' },
						{ name: 'flattenNodes', type: 'method' },
						{ name: 'afterFlattenNodes', type: 'method' },
					],
					'perser-methods-visit': [
						{ name: 'visitDoctype', type: 'method' },
						{ name: 'visitComment', type: 'method' },
						{ name: 'visitText', type: 'method' },
						{ name: 'visitElement', type: 'method' },
						{ name: 'visitPsBlock', type: 'method' },
						{ name: 'visitChildren', type: 'method' },
						{ name: 'visitSpreadAttr', type: 'method' },
						{ name: 'visitAttr', type: 'method' },
						{ name: 'parseCodeFragment', type: 'method' },
					],
					'perser-methods-update': [
						{ name: 'updateLocation', type: 'method' },
						{ name: 'updateRaw', type: 'method' },
						{ name: 'updateElement', type: 'method' },
						{ name: 'updateAttr', type: 'method' },
					],
					'perser-methods-detection': [
						//
						{ name: 'detectElementType', type: 'method' },
					],
					'perser-methods-creation': [
						{ name: 'createToken', type: 'method' },
						{ name: 'sliceFragment', type: 'method' },
						{ name: 'getOffsetsFromCode', type: 'method' },
					],
					'perser-methods-manipurate': [
						{ name: 'walk', type: 'method' },
						{ name: 'appendChild', type: 'method' },
						{ name: 'replaceChild', type: 'method' },
					],
					'other-methods': [
						{
							type: 'method',
							kind: 'nonAccessor',
							static: false,
							accessibility: 'public',
							sort: 'alphabetical',
						},
					],
					'other-native-private-methods': [
						{
							name: '/^#/',
							type: 'method',
							kind: 'nonAccessor',
							static: false,
							accessibility: 'private',
							sort: 'alphabetical',
						},
					],
				},
				accessorPairPositioning: 'getThenSet',
			},
		],
		'@typescript-eslint/member-ordering': 0,
	},
};
