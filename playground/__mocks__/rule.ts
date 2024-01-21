const cssSyntax = {
	type: 'string',
	enum: ["<'--*'>", "<'-moz-appearance'>", "<'-moz-background-clip'>", '...more many types'],
};

const extendedType = {
	type: 'string',
	enum: [
		"<'color-profile'>",
		"<'color-rendering'>",
		"<'enable-background'>",
		'<animatable-value>',
		'<begin-value-list>',
		'<class-list>',
		'<clock-value>',
		'<color-matrix>',
		'<css-declaration-list>',
		'<dasharray>',
		'<end-value-list>',
		'<key-points>',
		'<key-splines>',
		'<key-times>',
		'<list-of-lengths>',
		'<list-of-numbers>',
		'<list-of-percentages>',
		'<list-of-svg-feature-string>',
		'<list-of-value>',
		'<number-optional-number>',
		'<origin>',
		'<points>',
		'<preserve-aspect-ratio>',
		'<rotate>',
		'<svg-font-size-adjust>',
		'<svg-font-size>',
		'<svg-path>',
		'<system-language>',
		'<text-coordinate>',
		'<view-box>',
		'AbsoluteURL',
		'Accept',
		'Any',
		'AutoComplete',
		'BCP47',
		'BaseURL',
		'BrowsingContextName',
		'BrowsingContextNameOrKeyword',
		'CustomElementName',
		'DOMID',
		'DateTime',
		'FunctionBody',
		'HTTPSchemaURL',
		'HashName',
		'IconSize',
		'Int',
		'ItemProp',
		'MIMEType',
		'NavigableTargetName',
		'NavigableTargetNameOrKeyword',
		'NoEmptyAny',
		'Number',
		'OneCodePointChar',
		'OneLineAny',
		'Pattern',
		'SerializedPermissionsPolicy',
		'SourceSizeList',
		'Srcset',
		'TabIndex',
		'URL',
		'Uint',
		'XMLName',
		'Zero',
	],
};

const htmlAttrRequirement = {
	type: 'string',
	enum: ['Boolean'],
};

const keywordDefinedType = {
	oneOf: [cssSyntax, extendedType, htmlAttrRequirement],
};

const list = {
	description:
		'- [Space-separated tokens](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#space-separated-tokens)\n- [Comma-separated tokens](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#comma-separated-tokens)',
	type: 'object',
	additionalProperties: false,
	required: ['token', 'separator'],
	properties: {
		token: {
			oneOf: [
				extendedType,
				{
					description:
						'[Enumerated attributes](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#enumerated-attribute)',
					type: 'object',
					additionalProperties: false,
					required: ['enum'],
					properties: {
						enum: {
							type: 'array',
							minItems: 1,
							uniqueItems: true,
							items: {
								type: 'string',
							},
						},
						disallowToSurroundBySpaces: {
							type: 'boolean',
						},
						caseInsensitive: {
							type: 'boolean',
						},
						invalidValueDefault: {
							type: 'string',
						},
						missingValueDefault: {
							type: 'string',
						},
						sameStates: {
							type: 'object',
							additionalProperties: true,
							patternProperties: {
								'.*': {
									type: 'array',
									minItems: 1,
									uniqueItems: true,
									items: {
										type: 'string',
									},
								},
							},
						},
					},
				},
			],
		},
		disallowToSurroundBySpaces: {
			type: 'boolean',
		},
		allowEmpty: {
			type: 'boolean',
		},
		ordered: {
			type: 'boolean',
		},
		unique: {
			type: 'boolean',
		},
		caseInsensitive: {
			type: 'boolean',
		},
		number: {
			oneOf: [
				{
					type: 'string',
					enum: ['zeroOrMore', 'oneOrMore'],
				},
				{
					type: 'object',
					additionalProperties: false,
					required: ['min', 'max'],
					properties: {
						min: {
							type: 'number',
						},
						max: {
							type: 'number',
						},
					},
				},
			],
		},
		separator: {
			type: 'string',
			enum: ['space', 'comma'],
		},
	},
};

const enumType = {
	description:
		'[Enumerated attributes](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#enumerated-attribute)',
	type: 'object',
	additionalProperties: false,
	required: ['enum'],
	properties: {
		enum: {
			type: 'array',
			minItems: 1,
			uniqueItems: true,
			items: {
				type: 'string',
			},
		},
		disallowToSurroundBySpaces: {
			type: 'boolean',
		},
		caseInsensitive: {
			type: 'boolean',
		},
		invalidValueDefault: {
			type: 'string',
		},
		missingValueDefault: {
			type: 'string',
		},
		sameStates: {
			type: 'object',
			additionalProperties: true,
			patternProperties: {
				'.*': {
					type: 'array',
					minItems: 1,
					uniqueItems: true,
					items: {
						type: 'string',
					},
				},
			},
		},
	},
};

const numbers = {
	description: '[Numbers](https://html.spec.whatwg.org/dev/common-microsyntaxes.html#numbers)',
	type: 'object',
	required: ['type'],
	additionalProperties: false,
	properties: {
		type: {
			type: 'string',
			enum: ['float', 'integer'],
		},
		gt: {
			type: 'number',
		},
		gte: {
			type: 'number',
		},
		lt: {
			type: 'number',
		},
		lte: {
			type: 'number',
		},
		clampable: {
			type: 'boolean',
		},
	},
};

export const rules = {
	oneOf: [
		{
			type: 'object',
			additionalProperties: false,
			properties: {
				'attr-duplication': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'attr-value-quotes': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'string',
							enum: ['double', 'single'],
							default: 'double',
							_description: {
								double: 'Warns if the attribute value is not quoted on double quotation mark.',
								single: 'Warns if the attribute value is not quoted on single quotation mark.',
							},
							'_description:ja': {
								double: 'ダブルクオーテーションで囲われていない場合に警告をします。',
								single: 'シングルクオーテーションで囲われていない場合に警告をします。',
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'string',
									enum: ['double', 'single'],
									default: 'double',
									_description: {
										double: 'Warns if the attribute value is not quoted on double quotation mark.',
										single: 'Warns if the attribute value is not quoted on single quotation mark.',
									},
									'_description:ja': {
										double: 'ダブルクオーテーションで囲われていない場合に警告をします。',
										single: 'シングルクオーテーションで囲われていない場合に警告をします。',
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'case-sensitive-attr-name': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'string',
							default: 'lower',
							enum: ['lower', 'upper'],
							_description: {
								lower: 'Warns that the attribute name is not in lowercase.',
								upper: 'Warns that the attribute name is not in uppercase.',
							},
							'_description:ja': {
								lower: '属性名が小文字に統一されていないと警告します（外来要素は対象外）。',
								upper: '属性名が小文字に統一されていないと警告します（外来要素は対象外）。',
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'string',
									default: 'lower',
									enum: ['lower', 'upper'],
									_description: {
										lower: 'Warns that the attribute name is not in lowercase.',
										upper: 'Warns that the attribute name is not in uppercase.',
									},
									'_description:ja': {
										lower: '属性名が小文字に統一されていないと警告します（外来要素は対象外）。',
										upper: '属性名が小文字に統一されていないと警告します（外来要素は対象外）。',
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'case-sensitive-tag-name': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'string',
							default: 'lower',
							enum: ['lower', 'upper'],
							_description: {
								lower: 'Warns that the tag name is not in lowercase.',
								upper: 'Warns that the tag name is not in uppercase.',
							},
							'_description:ja': {
								lower: 'タグ名が小文字に統一されていないと警告します（外来要素は対象外）。',
								upper: 'タグ名が小文字に統一されていないと警告します（外来要素は対象外）。',
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'string',
									default: 'lower',
									enum: ['lower', 'upper'],
									_description: {
										lower: 'Warns that the tag name is not in lowercase.',
										upper: 'Warns that the tag name is not in uppercase.',
									},
									'_description:ja': {
										lower: 'タグ名が小文字に統一されていないと警告します（外来要素は対象外）。',
										upper: 'タグ名が小文字に統一されていないと警告します（外来要素は対象外）。',
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'character-reference': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'class-naming': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'naming-convention',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							oneOf: [
								{
									type: 'string',
									minLength: 1,
								},
								{
									type: 'array',
									uniqueItems: true,
									minItems: 1,
									items: {
										type: 'string',
										minLength: 1,
									},
								},
							],
							description:
								'Sets a string that represents a regular expression or its array. Regular expressions are interpreted as regular expressions by enclosing them in `/`. It is possible to add a flag like `/.*/ ig` (regular expressions can only be interpreted by JavaScript).',
							'description:ja':
								'正規表現を表す文字列かその配列を設定します。正規表現は `/` で囲むことで正規表現として解釈されます。 `/.*/ig` のようにフラグをつけることも可能です（正規表現はJavaScriptで解釈できるもに限ります）。',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									oneOf: [
										{
											type: 'string',
											minLength: 1,
										},
										{
											type: 'array',
											uniqueItems: true,
											minItems: 1,
											items: {
												type: 'string',
												minLength: 1,
											},
										},
									],
									description:
										'Sets a string that represents a regular expression or its array. Regular expressions are interpreted as regular expressions by enclosing them in `/`. It is possible to add a flag like `/.*/ ig` (regular expressions can only be interpreted by JavaScript).',
									'description:ja':
										'正規表現を表す文字列かその配列を設定します。正規表現は `/` で囲むことで正規表現として解釈されます。 `/.*/ig` のようにフラグをつけることも可能です（正規表現はJavaScriptで解釈できるもに限ります）。',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'deprecated-attr': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'deprecated-element': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'disallowed-element': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'array',
							items: {
								type: 'string',
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'array',
									items: {
										type: 'string',
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				doctype: {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'string',
							enum: ['always'],
							default: 'always',
							_description: {
								always: "Warns when doesn't declare Doctype. Ignore when document is fragment.",
							},
							'_description:ja': {
								always: 'Doctype宣言が書かれていないと警告します（要素の断片は対象外）。',
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'string',
									enum: ['always'],
									default: 'always',
									_description: {
										always: "Warns when doesn't declare Doctype. Ignore when document is fragment.",
									},
									'_description:ja': {
										always: 'Doctype宣言が書かれていないと警告します（要素の断片は対象外）。',
									},
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										denyObsoleteType: {
											type: 'boolean',
											default: 'true',
											description: 'Warns that the type is not `<!doctype html>`.',
											'description:ja': '`<!doctype html>`以外のDoctypeだと警告します。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										denyObsoleteType: {
											type: 'boolean',
											default: 'true',
											description: 'Warns that the type is not `<!doctype html>`.',
											'description:ja': '`<!doctype html>`以外のDoctypeだと警告します。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'id-duplication': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'end-tag': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'ineffective-attr': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'invalid-attr': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									description:
										'```ts\ntype Attr = {\n  name: string;\n  value: AttributeType | ValueRule;\n}\n\ntype ValueRule =\n  | { enum: [string, ...string[]]; }\n  | { pattern: string; }\n  | { type: AttributeType; };\n```\n\n`AttributeType` is [The type API](/docs/api/types).',
									'description:ja':
										'```ts\ntype Attr = {\n  name: string;\n  value: AttributeType | ValueRule;\n}\n\ntype ValueRule =\n  | { enum: [string, ...string[]]; }\n  | { pattern: string; }\n  | { type: AttributeType; };\n```\n\n`AttributeType`は[タイプAPI](/docs/api/types)を参照してください。',
									properties: {
										allowAttrs: {
											oneOf: [
												{
													type: 'array',
													items: {
														oneOf: [
															{
																type: 'string',
															},
															{
																type: 'object',
																_type: 'Attr',
																additionalProperties: false,
																required: ['name', 'value'],
																properties: {
																	name: {
																		type: 'string',
																	},
																	value: {
																		oneOf: [
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['enum'],
																				properties: {
																					enum: {
																						type: 'array',
																						uniqueItems: true,
																						items: {
																							type: 'string',
																							minimum: 1,
																						},
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['pattern'],
																				properties: {
																					pattern: {
																						type: 'string',
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['type'],
																				properties: {
																					type: {
																						oneOf: [
																							keywordDefinedType,
																							list,
																							enumType,
																							numbers,
																						],
																					},
																				},
																			},
																			{
																				oneOf: [
																					keywordDefinedType,
																					list,
																					enumType,
																					numbers,
																				],
																			},
																		],
																	},
																},
															},
														],
													},
												},
												{
													type: 'object',
													_type: 'Record<string, ValueRule>',
													additionalProperties: {
														type: 'object',
														oneOf: [
															{
																$ref: '#/definitions/enum',
															},
															{
																$ref: '#/definitions/pattern',
															},
															{
																$ref: '#/definitions/type',
															},
														],
													},
												},
											],
											description:
												'Specify the attributes **to allow**. This is useful when you want to intentionally specify attributes not present in the HTML Standard or when you want to avoid warnings for attributes required by frameworks. You can specify the attribute name only or provide patterns and data types for attribute values.',
											'description:ja':
												'**許可する**属性を指定します。これは、HTML標準に存在しない属性をあえて指定したい場合や、フレームワークなどで必要な属性を警告されないようにするものです。属性名だけの指定もできますし、属性値に対してのパターンやデータ型の指定が可能です。',
										},
										disallowAttrs: {
											oneOf: [
												{
													type: 'array',
													items: {
														oneOf: [
															{
																type: 'string',
															},
															{
																type: 'object',
																_type: 'Attr',
																additionalProperties: false,
																required: ['name', 'value'],
																properties: {
																	name: {
																		type: 'string',
																	},
																	value: {
																		oneOf: [
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['enum'],
																				properties: {
																					enum: {
																						type: 'array',
																						uniqueItems: true,
																						items: {
																							type: 'string',
																							minimum: 1,
																						},
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['pattern'],
																				properties: {
																					pattern: {
																						type: 'string',
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['type'],
																				properties: {
																					type: {
																						oneOf: [
																							keywordDefinedType,
																							list,
																							enumType,
																							numbers,
																						],
																					},
																				},
																			},
																			{
																				oneOf: [
																					keywordDefinedType,
																					list,
																					enumType,
																					numbers,
																				],
																			},
																		],
																	},
																},
															},
														],
													},
												},
												{
													type: 'object',
													_type: 'Record<string, ValueRule>',
													additionalProperties: {
														type: 'object',
														oneOf: [
															{
																$ref: '#/definitions/enum',
															},
															{
																$ref: '#/definitions/pattern',
															},
															{
																$ref: '#/definitions/type',
															},
														],
													},
												},
											],
											description:
												"Specify the attributes **to disallow**. Even if they are allowed in the HTML Standard, you can use this option to intentionally prohibit them based on your project's rules. The format for specifying disallowed attributes is the same as for `allowAttrs`, **but the meanings are reversed**.",
											'description:ja':
												'**許可しない**属性を指定します。HTML標準で許可されていたとしても、あえてプロジェクトのルールで禁止するような場合に利用します。指定内容は`allowAttrs`と同じ形式を受け取りますが、**その意味はすべて逆になります**。',
										},
										ignoreAttrNamePrefix: {
											oneOf: [
												{
													type: 'string',
												},
												{
													type: 'array',
													uniqueItems: true,
													minItems: 1,
													items: {
														type: 'string',
													},
												},
											],
											description:
												'Set prefixes to exclude special attributes or directives for the library and template engine that do not exist in the HTML specifications.',
											'description:ja':
												'HTMLの仕様には存在しない、Viewライブラリやテンプレートエンジン固有の属性およびディレクティブを除外するために、プレフィックスを設定します。',
										},
										allowToAddPropertiesForPretender: {
											type: 'boolean',
											default: 'true',
											description:
												'Allow adding properties for a component that pretends to be an HTML native element. The default is `true`. It warns of finding a non-existence attribute if it is set `false` and you use the `pretenders` option.',
											'description:ja':
												'HTML要素に偽装しているコンポーネントのプロパティを追加できるようにします。デフォルトは`true`です。`pretenders`オプションを使用している場合に`false`に設定されていると、存在しない属性が見つかると警告します。',
										},
										attrs: {
											deprecated: true,
											type: 'object',
											additionalProperties: {
												type: 'object',
												oneOf: [
													{
														$ref: '#/definitions/enum',
													},
													{
														$ref: '#/definitions/pattern',
													},
													{
														$ref: '#/definitions/type',
													},
													{
														type: 'object',
														additionalProperties: false,
														required: ['disallowed'],
														properties: {
															disallowed: {
																type: 'boolean',
															},
														},
													},
												],
											},
											description:
												'[Deprecated (since v3.7.0): Use `allowAttrs` or `disallowAttrs` instead.] Setting custom rule. Set either `enum`, `pattern`, `type` or `disallowed`.',
											'description:ja':
												'[非推奨(v3.7.0より): `allowAttrs`か`disallowAttrs`を利用してください] `enum` `pattern` `type` `disallowed` のいずれかで設定します。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									description:
										'```ts\ntype Attr = {\n  name: string;\n  value: AttributeType | ValueRule;\n}\n\ntype ValueRule =\n  | { enum: [string, ...string[]]; }\n  | { pattern: string; }\n  | { type: AttributeType; };\n```\n\n`AttributeType` is [The type API](/docs/api/types).',
									'description:ja':
										'```ts\ntype Attr = {\n  name: string;\n  value: AttributeType | ValueRule;\n}\n\ntype ValueRule =\n  | { enum: [string, ...string[]]; }\n  | { pattern: string; }\n  | { type: AttributeType; };\n```\n\n`AttributeType`は[タイプAPI](/docs/api/types)を参照してください。',
									properties: {
										allowAttrs: {
											oneOf: [
												{
													type: 'array',
													items: {
														oneOf: [
															{
																type: 'string',
															},
															{
																type: 'object',
																_type: 'Attr',
																additionalProperties: false,
																required: ['name', 'value'],
																properties: {
																	name: {
																		type: 'string',
																	},
																	value: {
																		oneOf: [
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['enum'],
																				properties: {
																					enum: {
																						type: 'array',
																						uniqueItems: true,
																						items: {
																							type: 'string',
																							minimum: 1,
																						},
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['pattern'],
																				properties: {
																					pattern: {
																						type: 'string',
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['type'],
																				properties: {
																					type: {
																						oneOf: [
																							keywordDefinedType,
																							list,
																							enumType,
																							numbers,
																						],
																					},
																				},
																			},
																			{
																				oneOf: [
																					keywordDefinedType,
																					list,
																					enumType,
																					numbers,
																				],
																			},
																		],
																	},
																},
															},
														],
													},
												},
												{
													type: 'object',
													_type: 'Record<string, ValueRule>',
													additionalProperties: {
														type: 'object',
														oneOf: [
															{
																$ref: '#/definitions/enum',
															},
															{
																$ref: '#/definitions/pattern',
															},
															{
																$ref: '#/definitions/type',
															},
														],
													},
												},
											],
											description:
												'Specify the attributes **to allow**. This is useful when you want to intentionally specify attributes not present in the HTML Standard or when you want to avoid warnings for attributes required by frameworks. You can specify the attribute name only or provide patterns and data types for attribute values.',
											'description:ja':
												'**許可する**属性を指定します。これは、HTML標準に存在しない属性をあえて指定したい場合や、フレームワークなどで必要な属性を警告されないようにするものです。属性名だけの指定もできますし、属性値に対してのパターンやデータ型の指定が可能です。',
										},
										disallowAttrs: {
											oneOf: [
												{
													type: 'array',
													items: {
														oneOf: [
															{
																type: 'string',
															},
															{
																type: 'object',
																_type: 'Attr',
																additionalProperties: false,
																required: ['name', 'value'],
																properties: {
																	name: {
																		type: 'string',
																	},
																	value: {
																		oneOf: [
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['enum'],
																				properties: {
																					enum: {
																						type: 'array',
																						uniqueItems: true,
																						items: {
																							type: 'string',
																							minimum: 1,
																						},
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['pattern'],
																				properties: {
																					pattern: {
																						type: 'string',
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['type'],
																				properties: {
																					type: {
																						oneOf: [
																							keywordDefinedType,
																							list,
																							enumType,
																							numbers,
																						],
																					},
																				},
																			},
																			{
																				oneOf: [
																					keywordDefinedType,
																					list,
																					enumType,
																					numbers,
																				],
																			},
																		],
																	},
																},
															},
														],
													},
												},
												{
													type: 'object',
													_type: 'Record<string, ValueRule>',
													additionalProperties: {
														type: 'object',
														oneOf: [
															{
																$ref: '#/definitions/enum',
															},
															{
																$ref: '#/definitions/pattern',
															},
															{
																$ref: '#/definitions/type',
															},
														],
													},
												},
											],
											description:
												"Specify the attributes **to disallow**. Even if they are allowed in the HTML Standard, you can use this option to intentionally prohibit them based on your project's rules. The format for specifying disallowed attributes is the same as for `allowAttrs`, **but the meanings are reversed**.",
											'description:ja':
												'**許可しない**属性を指定します。HTML標準で許可されていたとしても、あえてプロジェクトのルールで禁止するような場合に利用します。指定内容は`allowAttrs`と同じ形式を受け取りますが、**その意味はすべて逆になります**。',
										},
										ignoreAttrNamePrefix: {
											oneOf: [
												{
													type: 'string',
												},
												{
													type: 'array',
													uniqueItems: true,
													minItems: 1,
													items: {
														type: 'string',
													},
												},
											],
											description:
												'Set prefixes to exclude special attributes or directives for the library and template engine that do not exist in the HTML specifications.',
											'description:ja':
												'HTMLの仕様には存在しない、Viewライブラリやテンプレートエンジン固有の属性およびディレクティブを除外するために、プレフィックスを設定します。',
										},
										allowToAddPropertiesForPretender: {
											type: 'boolean',
											default: 'true',
											description:
												'Allow adding properties for a component that pretends to be an HTML native element. The default is `true`. It warns of finding a non-existence attribute if it is set `false` and you use the `pretenders` option.',
											'description:ja':
												'HTML要素に偽装しているコンポーネントのプロパティを追加できるようにします。デフォルトは`true`です。`pretenders`オプションを使用している場合に`false`に設定されていると、存在しない属性が見つかると警告します。',
										},
										attrs: {
											deprecated: true,
											type: 'object',
											additionalProperties: {
												type: 'object',
												oneOf: [
													{
														$ref: '#/definitions/enum',
													},
													{
														$ref: '#/definitions/pattern',
													},
													{
														$ref: '#/definitions/type',
													},
													{
														type: 'object',
														additionalProperties: false,
														required: ['disallowed'],
														properties: {
															disallowed: {
																type: 'boolean',
															},
														},
													},
												],
											},
											description:
												'[Deprecated (since v3.7.0): Use `allowAttrs` or `disallowAttrs` instead.] Setting custom rule. Set either `enum`, `pattern`, `type` or `disallowed`.',
											'description:ja':
												'[非推奨(v3.7.0より): `allowAttrs`か`disallowAttrs`を利用してください] `enum` `pattern` `type` `disallowed` のいずれかで設定します。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'label-has-control': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'landmark-roles': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										ignoreRoles: {
											type: 'array',
											uniqueItems: true,
											minItems: 1,
											items: {
												type: 'string',
												enum: [
													'banner',
													'main',
													'complementary',
													'contentinfo',
													'form',
													'navigation',
													'region',
												],
											},
											default: '[]',
											description: 'Excludes the specified landmark roll from the warning.',
											'description:ja': '指定したランドマークロールを警告の対象から除外します。',
										},
										labelEachArea: {
											type: 'boolean',
											default: 'true',
											description:
												'Warn if there is a unique label if a particular landmark role is used multiple times on the page.',
											'description:ja':
												'特定のランドマークロールがページで複数回使用される場合、一意のラベルがあるか警告します。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										ignoreRoles: {
											type: 'array',
											uniqueItems: true,
											minItems: 1,
											items: {
												type: 'string',
												enum: [
													'banner',
													'main',
													'complementary',
													'contentinfo',
													'form',
													'navigation',
													'region',
												],
											},
											default: '[]',
											description: 'Excludes the specified landmark roll from the warning.',
											'description:ja': '指定したランドマークロールを警告の対象から除外します。',
										},
										labelEachArea: {
											type: 'boolean',
											default: 'true',
											description:
												'Warn if there is a unique label if a particular landmark role is used multiple times on the page.',
											'description:ja':
												'特定のランドマークロールがページで複数回使用される場合、一意のラベルがあるか警告します。',
										},
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'no-boolean-attr-value': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'no-default-value': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'style',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'no-empty-palpable-content': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										extendsExposableElements: {
											type: 'boolean',
											default: 'true',
											description:
												"Include elements that are not palpable content, but are exposed to the accessibility tree. The palpable content model doesn't include some elements that are `li`, `dt`, `dd`, `th`, `td`, and more. This option exists to that detect those elements that are empty.",
											'description:ja':
												'アクセシビリティツリーに公開されているパルパブルコンテンツではない要素を含めます。パルパブルコンテンツモデルには、`li`、`dt`、`dd`、`th`、`td`などの一部の要素が含まれません。このオプションは、それらの要素が空であることを検出するために存在します。',
										},
										ignoreIfAriaBusy: {
											type: 'boolean',
											default: 'true',
											description: 'Avoid evaluating it if the element has `aria-busy=true`.',
											'description:ja': '要素に`aria-busy=true`がある場合は無視されます。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										extendsExposableElements: {
											type: 'boolean',
											default: 'true',
											description:
												"Include elements that are not palpable content, but are exposed to the accessibility tree. The palpable content model doesn't include some elements that are `li`, `dt`, `dd`, `th`, `td`, and more. This option exists to that detect those elements that are empty.",
											'description:ja':
												'アクセシビリティツリーに公開されているパルパブルコンテンツではない要素を含めます。パルパブルコンテンツモデルには、`li`、`dt`、`dd`、`th`、`td`などの一部の要素が含まれません。このオプションは、それらの要素が空であることを検出するために存在します。',
										},
										ignoreIfAriaBusy: {
											type: 'boolean',
											default: 'true',
											description: 'Avoid evaluating it if the element has `aria-busy=true`.',
											'description:ja': '要素に`aria-busy=true`がある場合は無視されます。',
										},
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'no-hard-code-id': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'maintainability',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'no-refer-to-non-existent-id': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										ariaVersion: {
											type: 'string',
											enum: ['1.1', '1.2'],
											default: '1.2',
											description: 'Choose the version of WAI-ARIA to evaluate.',
											'description:ja': '評価する WAI-ARIA のバージョンを指定します。',
										},
										fragmentRefersNameAttr: {
											type: 'boolean',
											default: false,
											description:
												'The fragment refers to IDs but also the value of name attributes.',
											'description:ja':
												'フラグメントの参照先をIDだけでなくname属性の値も含めます。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										ariaVersion: {
											type: 'string',
											enum: ['1.1', '1.2'],
											default: '1.2',
											description: 'Choose the version of WAI-ARIA to evaluate.',
											'description:ja': '評価する WAI-ARIA のバージョンを指定します。',
										},
										fragmentRefersNameAttr: {
											type: 'boolean',
											default: false,
											description:
												'The fragment refers to IDs but also the value of name attributes.',
											'description:ja':
												'フラグメントの参照先をIDだけでなくname属性の値も含めます。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'no-use-event-handler-attr': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'maintainability',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										ignore: {
											oneOf: [
												{
													type: 'string',
												},
												{
													type: 'array',
													items: {
														type: 'string',
													},
												},
											],
											description:
												'Specify the event handler to ignore as string or string array. It accepts even in a regex format.',
											'description:ja':
												'除外するイベントハンドラを文字列か文字列の配列で指定します。正規表現形式も受け付けます。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										ignore: {
											oneOf: [
												{
													type: 'string',
												},
												{
													type: 'array',
													items: {
														type: 'string',
													},
												},
											],
											description:
												'Specify the event handler to ignore as string or string array. It accepts even in a regex format.',
											'description:ja':
												'除外するイベントハンドラを文字列か文字列の配列で指定します。正規表現形式も受け付けます。',
										},
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'permitted-contents': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'array',
							items: {
								type: 'object',
								additionalProperties: false,
								required: ['tag', 'contents'],
								properties: {
									tag: {
										type: 'string',
									},
									contents: {
										type: 'array',
										items: {
											oneOf: [
												{
													type: 'object',
													additionalProperties: false,
													required: ['require'],
													properties: {
														require: {
															type: 'string',
														},
														max: {
															type: 'integer',
															minimum: 1,
														},
													},
												},
												{
													type: 'object',
													additionalProperties: false,
													required: ['optional'],
													properties: {
														optional: {
															type: 'string',
														},
														max: {
															type: 'integer',
															minimum: 1,
														},
														min: {
															type: 'integer',
															minimum: 0,
														},
													},
												},
												{
													type: 'object',
													additionalProperties: false,
													required: ['oneOrMore'],
													properties: {
														oneOrMore: {
															type: 'string',
														},
														max: {
															type: 'integer',
															minimum: 1,
														},
														min: {
															type: 'integer',
															minimum: 0,
														},
													},
												},
												{
													type: 'object',
													additionalProperties: false,
													required: ['choice'],
													properties: {
														choice: {
															type: 'array',
															items: {
																oneOf: [
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['require'],
																		properties: {
																			require: {
																				type: 'string',
																			},
																			max: {
																				type: 'integer',
																				minimum: 1,
																			},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['optional'],
																		properties: {
																			optional: {
																				type: 'string',
																			},
																			max: {
																				type: 'integer',
																				minimum: 1,
																			},
																			min: {
																				type: 'integer',
																				minimum: 0,
																			},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['oneOrMore'],
																		properties: {
																			oneOrMore: {
																				type: 'string',
																			},
																			max: {
																				type: 'integer',
																				minimum: 1,
																			},
																			min: {
																				type: 'integer',
																				minimum: 0,
																			},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['choice'],
																		properties: {
																			choice: {},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['interleave'],
																		properties: {
																			interleave: {},
																		},
																	},
																],
															},
														},
													},
												},
												{
													type: 'object',
													additionalProperties: false,
													required: ['interleave'],
													properties: {
														interleave: {
															type: 'array',
															items: {
																oneOf: [
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['require'],
																		properties: {
																			require: {
																				type: 'string',
																			},
																			max: {
																				type: 'integer',
																				minimum: 1,
																			},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['optional'],
																		properties: {
																			optional: {
																				type: 'string',
																			},
																			max: {
																				type: 'integer',
																				minimum: 1,
																			},
																			min: {
																				type: 'integer',
																				minimum: 0,
																			},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['oneOrMore'],
																		properties: {
																			oneOrMore: {
																				type: 'string',
																			},
																			max: {
																				type: 'integer',
																				minimum: 1,
																			},
																			min: {
																				type: 'integer',
																				minimum: 0,
																			},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['choice'],
																		properties: {
																			choice: {},
																		},
																	},
																	{
																		type: 'object',
																		additionalProperties: false,
																		required: ['interleave'],
																		properties: {
																			interleave: {},
																		},
																	},
																],
															},
														},
													},
												},
											],
										},
									},
								},
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'array',
									items: {
										type: 'object',
										additionalProperties: false,
										required: ['tag', 'contents'],
										properties: {
											tag: {
												type: 'string',
											},
											contents: {
												type: 'array',
												items: {
													oneOf: [
														{
															type: 'object',
															additionalProperties: false,
															required: ['require'],
															properties: {
																require: {
																	type: 'string',
																},
																max: {
																	type: 'integer',
																	minimum: 1,
																},
															},
														},
														{
															type: 'object',
															additionalProperties: false,
															required: ['optional'],
															properties: {
																optional: {
																	type: 'string',
																},
																max: {
																	type: 'integer',
																	minimum: 1,
																},
																min: {
																	type: 'integer',
																	minimum: 0,
																},
															},
														},
														{
															type: 'object',
															additionalProperties: false,
															required: ['oneOrMore'],
															properties: {
																oneOrMore: {
																	type: 'string',
																},
																max: {
																	type: 'integer',
																	minimum: 1,
																},
																min: {
																	type: 'integer',
																	minimum: 0,
																},
															},
														},
														{
															type: 'object',
															additionalProperties: false,
															required: ['choice'],
															properties: {
																choice: {
																	type: 'array',
																	items: {
																		oneOf: [
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['require'],
																				properties: {
																					require: {
																						type: 'string',
																					},
																					max: {
																						type: 'integer',
																						minimum: 1,
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['optional'],
																				properties: {
																					optional: {
																						type: 'string',
																					},
																					max: {
																						type: 'integer',
																						minimum: 1,
																					},
																					min: {
																						type: 'integer',
																						minimum: 0,
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['oneOrMore'],
																				properties: {
																					oneOrMore: {
																						type: 'string',
																					},
																					max: {
																						type: 'integer',
																						minimum: 1,
																					},
																					min: {
																						type: 'integer',
																						minimum: 0,
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['choice'],
																				properties: {
																					choice: {},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['interleave'],
																				properties: {
																					interleave: {},
																				},
																			},
																		],
																	},
																},
															},
														},
														{
															type: 'object',
															additionalProperties: false,
															required: ['interleave'],
															properties: {
																interleave: {
																	type: 'array',
																	items: {
																		oneOf: [
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['require'],
																				properties: {
																					require: {
																						type: 'string',
																					},
																					max: {
																						type: 'integer',
																						minimum: 1,
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['optional'],
																				properties: {
																					optional: {
																						type: 'string',
																					},
																					max: {
																						type: 'integer',
																						minimum: 1,
																					},
																					min: {
																						type: 'integer',
																						minimum: 0,
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['oneOrMore'],
																				properties: {
																					oneOrMore: {
																						type: 'string',
																					},
																					max: {
																						type: 'integer',
																						minimum: 1,
																					},
																					min: {
																						type: 'integer',
																						minimum: 0,
																					},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['choice'],
																				properties: {
																					choice: {},
																				},
																			},
																			{
																				type: 'object',
																				additionalProperties: false,
																				required: ['interleave'],
																				properties: {
																					interleave: {},
																				},
																			},
																		],
																	},
																},
															},
														},
													],
												},
											},
										},
									},
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										ignoreHasMutableChildren: {
											type: 'boolean',
											default: 'true',
											description: 'Ignore if it has mutable child elements in a dynamic syntax.',
											'description:ja':
												'動的な構文などで、ミュータブルな子要素を持つ場合は無視します。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										ignoreHasMutableChildren: {
											type: 'boolean',
											default: 'true',
											description: 'Ignore if it has mutable child elements in a dynamic syntax.',
											'description:ja':
												'動的な構文などで、ミュータブルな子要素を持つ場合は無視します。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'placeholder-label-option': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'require-accessible-name': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										ariaVersion: {
											type: 'string',
											enum: ['1.1', '1.2'],
											default: '1.2',
											description: 'Choose the version of WAI-ARIA to evaluate.',
											'description:ja': '評価するWAI-ARIAのバージョンを指定します。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										ariaVersion: {
											type: 'string',
											enum: ['1.1', '1.2'],
											default: '1.2',
											description: 'Choose the version of WAI-ARIA to evaluate.',
											'description:ja': '評価するWAI-ARIAのバージョンを指定します。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'require-datetime': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										langs: {
											type: 'array',
											items: {
												type: 'string',
												enum: ['en', 'ja', 'fr', 'nl', 'ru', 'de', 'pt', 'zh'],
												uniqueItems: true,
												minItems: 1,
											},
											default: ['en', 'ja', 'fr', 'nl', 'ru', 'de', 'pt', 'zh'],
											description:
												'Specify languages that are parsing the content, and its order. They are parsable depending on [Chrono](https://github.com/wanasit/chrono).',
											'description:ja':
												'コンテンツを解析する言語、またその優先順位を指定します。解析可能かどうかは[Chrono](https://github.com/wanasit/chrono)次第です。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										langs: {
											type: 'array',
											items: {
												type: 'string',
												enum: ['en', 'ja', 'fr', 'nl', 'ru', 'de', 'pt', 'zh'],
												uniqueItems: true,
												minItems: 1,
											},
											default: ['en', 'ja', 'fr', 'nl', 'ru', 'de', 'pt', 'zh'],
											description:
												'Specify languages that are parsing the content, and its order. They are parsable depending on [Chrono](https://github.com/wanasit/chrono).',
											'description:ja':
												'コンテンツを解析する言語、またその優先順位を指定します。解析可能かどうかは[Chrono](https://github.com/wanasit/chrono)次第です。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'required-attr': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							oneOf: [
								{
									type: 'string',
								},
								{
									type: 'array',
									minItems: 1,
									items: {
										oneOf: [
											{
												type: 'string',
											},
											{
												type: 'object',
												_type: 'Attr',
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
																type: 'array',
																minItems: 1,
																items: {
																	type: 'string',
																},
															},
														],
													},
												},
											},
										],
									},
								},
							],
							description: '```ts\ntype Attr = {\n  name: string;\n  value?: string | string[];\n};\n```',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									oneOf: [
										{
											type: 'string',
										},
										{
											type: 'array',
											minItems: 1,
											items: {
												oneOf: [
													{
														type: 'string',
													},
													{
														type: 'object',
														_type: 'Attr',
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
																		type: 'array',
																		minItems: 1,
																		items: {
																			type: 'string',
																		},
																	},
																],
															},
														},
													},
												],
											},
										},
									],
									description:
										'```ts\ntype Attr = {\n  name: string;\n  value?: string | string[];\n};\n```',
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'required-element': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'validation',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'array',
							items: {
								type: 'string',
							},
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'array',
									items: {
										type: 'string',
									},
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										ignoreHasMutableContents: {
											type: 'boolean',
											default: 'true',
											description:
												'Ignore if it has mutable child elements in a preprocessor language like _Pug_ or a component library like _Vue_. (If use _Pug_ or _Vue_ need each [@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser) and [@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser))',
											'description:ja':
												'*Pug*のようなプリプロセッサ言語や*Vue*のようなコンポーネントライブラリにおけるミュータブルな子要素を含む場合、無視します。（*Pug*も、*Vue*も、それぞれ[@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser)や[@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser)が必要です）',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										ignoreHasMutableContents: {
											type: 'boolean',
											default: 'true',
											description:
												'Ignore if it has mutable child elements in a preprocessor language like _Pug_ or a component library like _Vue_. (If use _Pug_ or _Vue_ need each [@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser) and [@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser))',
											'description:ja':
												'*Pug*のようなプリプロセッサ言語や*Vue*のようなコンポーネントライブラリにおけるミュータブルな子要素を含む場合、無視します。（*Pug*も、*Vue*も、それぞれ[@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser)や[@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser)が必要です）',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'required-h1': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										'expected-once': {
											type: 'boolean',
											default: 'true',
											description: 'Warn if there is a duplicate `h1` tag in the document.',
											'description:ja': 'ドキュメント内で `h1`タグに重複があると警告します。',
										},
										'in-document-fragment': {
											type: 'boolean',
											default: 'false',
											description:
												'Set it to `true` if you want this rule to apply within document fragment rather than the entire document.',
											'description:ja':
												'ドキュメント全体ではなく、コードの断片内でこのルールを適用させたい場合、`true`にしてください。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										'expected-once': {
											type: 'boolean',
											default: 'true',
											description: 'Warn if there is a duplicate `h1` tag in the document.',
											'description:ja': 'ドキュメント内で `h1`タグに重複があると警告します。',
										},
										'in-document-fragment': {
											type: 'boolean',
											default: 'false',
											description:
												'Set it to `true` if you want this rule to apply within document fragment rather than the entire document.',
											'description:ja':
												'ドキュメント全体ではなく、コードの断片内でこのルールを適用させたい場合、`true`にしてください。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'use-list': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'array',
							items: {
								type: 'string',
								minItems: 1,
							},
							description:
								'Specify the characters of the bullet that you expect to interpret as a list. It expects an array of code points. Default value is [Bullets](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/src/use-list/index.ts#L11-L52).\n\nIt executes after decoding character references to be a code point. For example, it decodes `"&bullet;"` to be `"•"`. **Note: You must specify a code point instead of the character reference you need.** It supports the surrogate pair code points.',
							'description:ja':
								'リストとして解釈されることを期待するビュレット文字などを指定します。コードポイントで構成される配列を指定します。デフォルト値は[Bullets](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/src/use-list/index.ts#L11-L52)です。HTML中の文字参照はコードポイントにデコードされた後、評価されます。たとえば、`"＆bullet;"`は`"•"`にデコードされます。 **注: 設定側では、期待する文字参照は代わりにコードポイントを指定する必要があります。** コードポイントはサロゲートペアをサポートしています。',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'array',
									items: {
										type: 'string',
										minItems: 1,
									},
									description:
										'Specify the characters of the bullet that you expect to interpret as a list. It expects an array of code points. Default value is [Bullets](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/src/use-list/index.ts#L11-L52).\n\nIt executes after decoding character references to be a code point. For example, it decodes `"&bullet;"` to be `"•"`. **Note: You must specify a code point instead of the character reference you need.** It supports the surrogate pair code points.',
									'description:ja':
										'リストとして解釈されることを期待するビュレット文字などを指定します。コードポイントで構成される配列を指定します。デフォルト値は[Bullets](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/rules/src/use-list/index.ts#L11-L52)です。HTML中の文字参照はコードポイントにデコードされた後、評価されます。たとえば、`"＆bullet;"`は`"•"`にデコードされます。 **注: 設定側では、期待する文字参照は代わりにコードポイントを指定する必要があります。** コードポイントはサロゲートペアをサポートしています。',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										spaceNeededBullets: {
											type: 'array',
											items: {
												type: 'string',
												minItems: 1,
											},
											default: '["-", "*", "+"]',
											description: 'Bullets that require space to detect as a list item.',
											'description:ja': 'リストとして検出するためにスペースを必要とする文字。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										spaceNeededBullets: {
											type: 'array',
											items: {
												type: 'string',
												minItems: 1,
											},
											default: '["-", "*", "+"]',
											description: 'Bullets that require space to detect as a list item.',
											'description:ja': 'リストとして検出するためにスペースを必要とする文字。',
										},
									},
								},
								severity: {
									default: 'warning',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
				'wai-aria': {
					$schema: 'http://json-schema.org/draft-07/schema#',
					_category: 'a11y',
					oneOf: [
						{
							type: 'boolean',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									type: 'boolean',
								},
								options: {
									type: 'object',
									additionalProperties: false,
									properties: {
										checkingValue: {
											type: 'boolean',
											default: 'true',
											description:
												"Warn if use an invalid value of the property/state. You can temporarily disable this option if the WAI-ARIA spec update rather than markuplint add new value to the allowed list ahead. Don't recommend disabling basically.",
											'description:ja':
												'プロパティ/ステートの値をチェックします。このオプションは、Markuplintが許可リストに追加するよりも先にWAI-ARIAの仕様が更新された場合などに、必要に応じて一時的に無効化できるようにしています。基本的に無効化を推奨しません。',
										},
										checkingDeprecatedProps: {
											type: 'boolean',
											default: 'true',
											description:
												"Warn if use deprecated property/state. You can temporarily disable this not to evaluate WAI-ARIA old version. Don't recommend disabling basically.",
											'description:ja':
												'非推奨（廃止予定）のプロパティ/ステートの値をチェックします。WAI-ARIAの古いバージョンのためにこの評価を無効化できます。基本的に無効化を推奨しません。',
										},
										permittedAriaRoles: {
											type: 'boolean',
											default: 'true',
											description:
												'Warn if use the not permitted role according to ARIA in HTML. This is based on the spec ARIA in HTML and is not strictly the spec WAI-ARIA, so it is an option.',
											'description:ja':
												'ARIA in HTMLの仕様において要素に許可されているロールかチェックします。ARIA in HTMLによるもので厳密にはWAI-ARIAの仕様ではないためオプションとしています。',
										},
										disallowSetImplicitRole: {
											type: 'boolean',
											default: 'true',
											description:
												'Disallow set the implicit role explicitly. This is based on the spec ARIA in HTML and is not strictly the spec WAI-ARIA, so it is an option.',
											'description:ja':
												'暗黙的なロールの明示的な設定を禁止します。ARIA in HTMLによるもので厳密にはWAI-ARIAの仕様ではないためオプションとしています。',
										},
										disallowSetImplicitProps: {
											type: 'boolean',
											default: 'true',
											description:
												'Disallow set the implicit property/state explicitly. This is based on the spec ARIA in HTML and is not strictly the spec WAI-ARIA, so it is an option.',
											'description:ja':
												'暗黙的なプロパティ/ステートの明示的な設定を禁止します。ARIA in HTMLによるもので厳密にはWAI-ARIAの仕様ではないためオプションとしています。',
										},
										disallowDefaultValue: {
											type: 'boolean',
											default: 'true',
											description:
												'Disallow set the default value of the property/state explicitly.',
											'description:ja':
												'プロパティ/ステートのデフォルト値の明示的な設定を禁止します。',
										},
										version: {
											type: 'string',
											enum: ['1.1', '1.2'],
											default: '1.2',
											description: 'Choose the version of WAI-ARIA to evaluate.',
											'description:ja': '評価するWAI-ARIAのバージョンを指定します。',
										},
									},
								},
								option: {
									deprecated: true,
									type: 'object',
									additionalProperties: false,
									properties: {
										checkingValue: {
											type: 'boolean',
											default: 'true',
											description:
												"Warn if use an invalid value of the property/state. You can temporarily disable this option if the WAI-ARIA spec update rather than markuplint add new value to the allowed list ahead. Don't recommend disabling basically.",
											'description:ja':
												'プロパティ/ステートの値をチェックします。このオプションは、Markuplintが許可リストに追加するよりも先にWAI-ARIAの仕様が更新された場合などに、必要に応じて一時的に無効化できるようにしています。基本的に無効化を推奨しません。',
										},
										checkingDeprecatedProps: {
											type: 'boolean',
											default: 'true',
											description:
												"Warn if use deprecated property/state. You can temporarily disable this not to evaluate WAI-ARIA old version. Don't recommend disabling basically.",
											'description:ja':
												'非推奨（廃止予定）のプロパティ/ステートの値をチェックします。WAI-ARIAの古いバージョンのためにこの評価を無効化できます。基本的に無効化を推奨しません。',
										},
										permittedAriaRoles: {
											type: 'boolean',
											default: 'true',
											description:
												'Warn if use the not permitted role according to ARIA in HTML. This is based on the spec ARIA in HTML and is not strictly the spec WAI-ARIA, so it is an option.',
											'description:ja':
												'ARIA in HTMLの仕様において要素に許可されているロールかチェックします。ARIA in HTMLによるもので厳密にはWAI-ARIAの仕様ではないためオプションとしています。',
										},
										disallowSetImplicitRole: {
											type: 'boolean',
											default: 'true',
											description:
												'Disallow set the implicit role explicitly. This is based on the spec ARIA in HTML and is not strictly the spec WAI-ARIA, so it is an option.',
											'description:ja':
												'暗黙的なロールの明示的な設定を禁止します。ARIA in HTMLによるもので厳密にはWAI-ARIAの仕様ではないためオプションとしています。',
										},
										disallowSetImplicitProps: {
											type: 'boolean',
											default: 'true',
											description:
												'Disallow set the implicit property/state explicitly. This is based on the spec ARIA in HTML and is not strictly the spec WAI-ARIA, so it is an option.',
											'description:ja':
												'暗黙的なプロパティ/ステートの明示的な設定を禁止します。ARIA in HTMLによるもので厳密にはWAI-ARIAの仕様ではないためオプションとしています。',
										},
										disallowDefaultValue: {
											type: 'boolean',
											default: 'true',
											description:
												'Disallow set the default value of the property/state explicitly.',
											'description:ja':
												'プロパティ/ステートのデフォルト値の明示的な設定を禁止します。',
										},
										version: {
											type: 'string',
											enum: ['1.1', '1.2'],
											default: '1.2',
											description: 'Choose the version of WAI-ARIA to evaluate.',
											'description:ja': '評価するWAI-ARIAのバージョンを指定します。',
										},
									},
								},
								severity: {
									default: 'error',
									type: 'string',
									enum: ['error', 'warning'],
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
			},
		},
		{
			title: 'Custom rule',
			description: '@see https://markuplint.dev/docs/guides/applying-rules#applying-custom-rules',
			examples: ['[plugin-name]/[rule-name]'],
			type: 'object',
			additionalProperties: false,
			patternProperties: {
				'^[^/]+/[^/]+$': {
					oneOf: [
						{
							$ref: '#/definitions/custom-rule-value',
						},
						{
							type: 'object',
							additionalProperties: false,
							properties: {
								value: {
									$ref: '#/definitions/custom-rule-value',
								},
								severity: {
									$ref: 'https://raw.githubusercontent.com/markuplint/markuplint/main/packages/%40markuplint/ml-config/schema.json#/definitions/severity',
								},
								reason: {
									type: 'string',
								},
							},
						},
					],
				},
			},
		},
	],
};
