import { rules } from './rule';

export const schema = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	type: 'object',
	additionalProperties: false,
	properties: {
		extends: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
		plugins: {
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'string',
					},
					{
						type: 'object',
						required: ['name'],
						additionalProperties: false,
						properties: {
							name: {
								type: 'string',
							},
							settings: {
								type: 'object',
							},
						},
					},
				],
			},
		},
		parser: {
			type: 'object',
			additionalProperties: {
				type: 'string',
			},
		},
		parserOptions: {
			type: 'object',
			additionalProperties: false,
			properties: {
				ignoreFrontMatter: {
					type: 'boolean',
				},
				authoredElementName: {
					oneOf: [
						{
							type: 'array',
							items: {
								type: 'string',
							},
						},
						{
							type: 'string',
						},
					],
				},
			},
		},
		excludeFiles: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
		specs: {
			oneOf: [
				{
					type: 'object',
					additionalProperties: {
						type: 'string',
					},
				},
				{
					description: 'This format is deprecated',
					type: 'array',
					items: {
						type: 'string',
					},
				},
			],
		},
		rules: rules,
		nodeRules: {
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'object',
						additionalProperties: false,
						required: ['selector', 'rules'],
						properties: {
							selector: {
								type: 'string',
							},
							rules: rules,
						},
					},
					{
						type: 'object',
						additionalProperties: false,
						required: ['regexSelector', 'rules'],
						properties: {
							regexSelector: {
								allOf: [
									{
										$ref: '#/definitions/regexSelectorWithoutCombination',
									},
									{
										type: 'object',
										properties: {
											combination: {
												allOf: [
													{
														type: 'object',
														required: ['combinator'],
														properties: {
															combinator: {
																$ref: '#/definitions/regexSelectorCombinator',
															},
														},
													},
													{
														$ref: '#/definitions/regexSelector',
													},
												],
											},
										},
									},
								],
							},
							rules: rules,
						},
					},
				],
			},
		},
		childNodeRules: {
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'object',
						additionalProperties: false,
						required: ['selector', 'rules'],
						properties: {
							selector: {
								type: 'string',
							},
							inheritance: {
								type: 'boolean',
							},
							rules: rules,
						},
					},
					{
						type: 'object',
						additionalProperties: false,
						required: ['regexSelector', 'rules'],
						properties: {
							regexSelector: {
								allOf: [
									{
										$ref: '#/definitions/regexSelectorWithoutCombination',
									},
									{
										type: 'object',
										properties: {
											combination: {
												allOf: [
													{
														type: 'object',
														required: ['combinator'],
														properties: {
															combinator: {
																$ref: '#/definitions/regexSelectorCombinator',
															},
														},
													},
													{
														$ref: '#/definitions/regexSelector',
													},
												],
											},
										},
									},
								],
							},
							inheritance: {
								type: 'boolean',
							},
							rules: rules,
						},
					},
				],
			},
		},
		pretenders: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['selector', 'as'],
				properties: {
					selector: {
						type: 'string',
					},
					as: {
						oneOf: [
							{
								type: 'string',
							},
							{
								type: 'object',
								additionalProperties: false,
								required: ['element'],
								properties: {
									element: {
										type: 'string',
									},
									namespace: {
										type: 'string',
										enum: ['svg'],
									},
									attrs: {
										type: 'array',
										items: {
											type: 'object',
											additionalProperties: false,
											required: ['name'],
											properties: {
												name: {
													type: 'string',
												},
												value: {
													oneOf: [
														{
															type: 'string',
														},
														{
															type: 'object',
															additionalProperties: false,
															required: ['fromAttr'],
															properties: {
																fromAttr: {
																	type: 'string',
																},
															},
														},
													],
												},
											},
										},
									},
									aria: {
										type: 'object',
										additionalProperties: false,
										required: ['name'],
										properties: {
											name: {
												type: 'string',
											},
											value: {
												oneOf: [
													{
														type: 'boolean',
													},
													{
														type: 'object',
														additionalProperties: false,
														required: ['fromAttr'],
														properties: {
															fromAttr: {
																type: 'string',
															},
														},
													},
												],
											},
										},
									},
								},
							},
						],
					},
				},
			},
		},
		overrides: {
			type: 'object',
			minProperties: 1,
			additionalProperties: {
				type: 'object',
				additionalProperties: false,
				properties: {
					plugins: {
						$ref: '#/definitions/plugins',
					},
					parser: {
						$ref: '#/definitions/parser',
					},
					parserOptions: {
						$ref: '#/definitions/parserOptions',
					},
					excludeFiles: {
						$ref: '#/definitions/excludeFiles',
					},
					specs: {
						$ref: '#/definitions/specs',
					},
					rules: {
						$ref: '#/definitions/rules',
					},
					nodeRules: {
						$ref: '#/definitions/nodeRules',
					},
					childNodeRules: {
						$ref: '#/definitions/childNodeRules',
					},
				},
			},
		},
	},
};
