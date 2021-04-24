import { pugParse } from './';

describe('parser', () => {
	it('basic code', () => {
		const ast = pugParse(`html(lang=en)
	head
		title Title
	body
		// HTML comment
		//- Pug comment
		<!-- HTML raw comment -->
		h1 Title
		p= variable
		p#the-id.the-class1.the-class2
			| lorem
		img(
			src="path/to"
			alt="image"
		)
		img#the-id2(
			src="path/to"
			alt="image"
		).the-class3
		<div>
			<span>Raw HTML</span>
		</div>
		ul
			each article in articles
				li: a(href=article.href)= article.title
		if bool
			div True
		else if bool2
			div Any
		else
			div False
		case variable
			when "cond"
				- break
			when "cond2"
				p Condition 2
			when "cond3"
				p Condition 3
			default
				p Default
		script.
			console.log(123);
		.
			<script>alert(123)</script>
		:any-filter(arg1 arg2 arg3=123)
			filter contents
`);
		// console.log(JSON.stringify(ast));
		expect(ast).toStrictEqual({
			type: 'Block',
			nodes: [
				{
					type: 'Tag',
					name: 'html',
					raw: 'html(lang=en)',
					offset: 0,
					endOffset: 13,
					line: 1,
					endLine: 1,
					column: 1,
					endColumn: 14,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Tag',
								name: 'head',
								raw: 'head',
								offset: 15,
								endOffset: 19,
								line: 2,
								endLine: 2,
								column: 2,
								endColumn: 6,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Tag',
											name: 'title',
											raw: 'title',
											offset: 22,
											endOffset: 27,
											line: 3,
											endLine: 3,
											column: 3,
											endColumn: 8,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'Title\n\t',
														offset: 28,
														endOffset: 35,
														line: 3,
														endLine: 4,
														column: 9,
														endColumn: 2,
													},
												],
												line: 3,
											},
											attrs: [],
										},
									],
									line: 2,
								},
								attrs: [],
							},
							{
								type: 'Tag',
								name: 'body',
								raw: 'body',
								offset: 35,
								endOffset: 39,
								line: 4,
								endLine: 4,
								column: 2,
								endColumn: 6,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Comment',
											val: ' HTML comment',
											buffer: true,
											raw: '// HTML comment',
											offset: 42,
											endOffset: 57,
											line: 5,
											endLine: 5,
											column: 3,
											endColumn: 18,
										},
										{
											type: 'Comment',
											val: ' Pug comment',
											buffer: false,
											raw: '//- Pug comment',
											offset: 60,
											endOffset: 75,
											line: 6,
											endLine: 6,
											column: 3,
											endColumn: 18,
										},
										{
											type: 'Text',
											raw: '<!-- HTML raw comment -->',
											offset: 78,
											endOffset: 103,
											line: 7,
											endLine: 7,
											column: 3,
											endColumn: 28,
										},
										{
											type: 'Tag',
											name: 'h1',
											raw: 'h1',
											offset: 106,
											endOffset: 108,
											line: 8,
											endLine: 8,
											column: 3,
											endColumn: 5,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'Title',
														offset: 109,
														endOffset: 114,
														line: 8,
														endLine: 8,
														column: 6,
														endColumn: 11,
													},
												],
												line: 8,
											},
											attrs: [],
										},
										{
											type: 'Tag',
											name: 'p',
											raw: 'p',
											offset: 117,
											endOffset: 118,
											line: 9,
											endLine: 9,
											column: 3,
											endColumn: 4,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Code',
														raw: '= variable',
														val: 'variable',
														buffer: true,
														mustEscape: true,
														isInline: true,
														offset: 118,
														endOffset: 128,
														line: 9,
														endLine: 9,
														column: 4,
														endColumn: 14,
													},
												],
												line: 9,
											},
											attrs: [],
										},
										{
											type: 'Tag',
											name: 'p',
											raw: 'p#the-id.the-class1.the-class2',
											offset: 131,
											endOffset: 161,
											line: 10,
											endLine: 10,
											column: 3,
											endColumn: 33,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'lorem\n\t\t',
														offset: 167,
														endOffset: 175,
														line: 11,
														endLine: 12,
														column: 6,
														endColumn: 3,
													},
												],
												line: 10,
											},
											attrs: [
												{
													name: 'id',
													val: "'the-id'",
													mustEscape: false,
													offset: 132,
													endOffset: 139,
													line: 10,
													endLine: 10,
													column: 4,
													endColumn: 11,
													raw: '#the-id',
												},
												{
													name: 'class',
													val: "'the-class1'",
													mustEscape: false,
													offset: 139,
													endOffset: 150,
													line: 10,
													endLine: 10,
													column: 11,
													endColumn: 22,
													raw: '.the-class1',
												},
												{
													name: 'class',
													val: "'the-class2'",
													mustEscape: false,
													offset: 150,
													endOffset: 161,
													line: 10,
													endLine: 10,
													column: 22,
													endColumn: 33,
													raw: '.the-class2',
												},
											],
										},
										{
											type: 'Tag',
											name: 'img',
											raw: 'img(\n\t\t\tsrc="path/to"\n\t\t\talt="image"\n\t\t)',
											offset: 175,
											endOffset: 215,
											line: 12,
											endLine: 15,
											column: 3,
											endColumn: 4,
											block: { type: 'Block', nodes: [], line: 12 },
											attrs: [
												{
													name: 'src',
													val: '"path/to"',
													mustEscape: true,
													offset: 183,
													endOffset: 196,
													line: 13,
													endLine: 13,
													column: 4,
													endColumn: 17,
													raw: 'src="path/to"',
												},
												{
													name: 'alt',
													val: '"image"',
													mustEscape: true,
													offset: 200,
													endOffset: 211,
													line: 14,
													endLine: 14,
													column: 4,
													endColumn: 15,
													raw: 'alt="image"',
												},
											],
										},
										{
											type: 'Tag',
											name: 'img',
											raw:
												'img#the-id2(\n\t\t\tsrc="path/to"\n\t\t\talt="image"\n\t\t).the-class3',
											offset: 218,
											endOffset: 277,
											line: 16,
											endLine: 19,
											column: 3,
											endColumn: 15,
											block: { type: 'Block', nodes: [], line: 16 },
											attrs: [
												{
													name: 'id',
													val: "'the-id2'",
													mustEscape: false,
													offset: 221,
													endOffset: 229,
													line: 16,
													endLine: 16,
													column: 6,
													endColumn: 14,
													raw: '#the-id2',
												},
												{
													name: 'src',
													val: '"path/to"',
													mustEscape: true,
													offset: 234,
													endOffset: 247,
													line: 17,
													endLine: 17,
													column: 4,
													endColumn: 17,
													raw: 'src="path/to"',
												},
												{
													name: 'alt',
													val: '"image"',
													mustEscape: true,
													offset: 251,
													endOffset: 262,
													line: 18,
													endLine: 18,
													column: 4,
													endColumn: 15,
													raw: 'alt="image"',
												},
												{
													name: 'class',
													val: "'the-class3'",
													mustEscape: false,
													offset: 266,
													endOffset: 277,
													line: 19,
													endLine: 19,
													column: 4,
													endColumn: 15,
													raw: '.the-class3',
												},
											],
										},
										{
											type: 'Text',
											raw: '<div>\n\t\t\t<span>Raw HTML</span>\n\t\t</div>',
											offset: 280,
											endOffset: 319,
											line: 20,
											endLine: 22,
											column: 3,
											endColumn: 9,
										},
										{
											type: 'Tag',
											name: 'ul',
											raw: 'ul',
											offset: 322,
											endOffset: 324,
											line: 23,
											endLine: 23,
											column: 3,
											endColumn: 5,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Each',
														val: 'article',
														obj: 'articles',
														key: null,
														raw: 'each article in articles',
														offset: 328,
														endOffset: 352,
														line: 24,
														endLine: 24,
														column: 4,
														endColumn: 28,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Tag',
																	name: 'li',
																	raw: 'li',
																	offset: 357,
																	endOffset: 359,
																	line: 25,
																	endLine: 25,
																	column: 5,
																	endColumn: 7,
																	block: {
																		type: 'Block',
																		nodes: [
																			{
																				type: 'Tag',
																				name: 'a',
																				raw: 'a(href=article.href)',
																				offset: 361,
																				endOffset: 381,
																				line: 25,
																				endLine: 25,
																				column: 9,
																				endColumn: 29,
																				block: {
																					type: 'Block',
																					nodes: [
																						{
																							type: 'Code',
																							raw: '= article.title',
																							val: 'article.title',
																							buffer: true,
																							mustEscape: true,
																							isInline: true,
																							offset: 381,
																							endOffset: 396,
																							line: 25,
																							endLine: 25,
																							column: 29,
																							endColumn: 44,
																						},
																					],
																					line: 25,
																				},
																				attrs: [
																					{
																						name: 'href',
																						val: 'article.href',
																						mustEscape: true,
																						offset: 363,
																						endOffset: 380,
																						line: 25,
																						endLine: 25,
																						column: 11,
																						endColumn: 28,
																						raw: 'href=article.href',
																					},
																				],
																			},
																		],
																		line: 25,
																	},
																	attrs: [],
																},
															],
															line: 25,
														},
													},
												],
												line: 23,
											},
											attrs: [],
										},
										{
											type: 'Conditional',
											raw: 'if bool',
											test: 'bool',
											offset: 399,
											endOffset: 406,
											line: 26,
											endLine: 26,
											column: 3,
											endColumn: 10,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Tag',
														name: 'div',
														raw: 'div',
														offset: 410,
														endOffset: 413,
														line: 27,
														endLine: 27,
														column: 4,
														endColumn: 7,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Text',
																	raw: 'True\n\t\t',
																	offset: 414,
																	endOffset: 421,
																	line: 27,
																	endLine: 28,
																	column: 8,
																	endColumn: 3,
																},
															],
															line: 27,
														},
														attrs: [],
													},
												],
												line: 27,
											},
										},
										{
											type: 'Conditional',
											raw: 'else if bool2',
											test: 'bool2',
											offset: 421,
											endOffset: 434,
											line: 28,
											endLine: 28,
											column: 3,
											endColumn: 16,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Tag',
														name: 'div',
														raw: 'div',
														offset: 438,
														endOffset: 441,
														line: 29,
														endLine: 29,
														column: 4,
														endColumn: 7,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Text',
																	raw: 'Any\n\t\t',
																	offset: 442,
																	endOffset: 448,
																	line: 29,
																	endLine: 30,
																	column: 8,
																	endColumn: 3,
																},
															],
															line: 29,
														},
														attrs: [],
													},
												],
												line: 29,
											},
										},
										{
											type: 'Conditional',
											raw: 'else',
											test: 'bool2',
											offset: 448,
											endOffset: 452,
											line: 30,
											endLine: 30,
											column: 3,
											endColumn: 7,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Tag',
														name: 'div',
														raw: 'div',
														offset: 456,
														endOffset: 459,
														line: 31,
														endLine: 31,
														column: 4,
														endColumn: 7,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Text',
																	raw: 'False\n\t\t',
																	offset: 460,
																	endOffset: 468,
																	line: 31,
																	endLine: 32,
																	column: 8,
																	endColumn: 3,
																},
															],
															line: 31,
														},
														attrs: [],
													},
												],
												line: 31,
											},
										},
										{
											type: 'Case',
											expr: 'variable',
											raw: 'case variable',
											offset: 468,
											endOffset: 481,
											line: 32,
											endLine: 32,
											column: 3,
											endColumn: 16,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'When',
														expr: '"cond"',
														raw: 'when "cond"',
														offset: 485,
														endOffset: 496,
														line: 33,
														endLine: 33,
														column: 4,
														endColumn: 15,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Code',
																	raw: '- break',
																	val: 'break',
																	buffer: false,
																	mustEscape: false,
																	isInline: false,
																	offset: 501,
																	endOffset: 508,
																	line: 34,
																	endLine: 34,
																	column: 5,
																	endColumn: 12,
																},
															],
															line: 34,
														},
													},
													{
														type: 'When',
														expr: '"cond2"',
														raw: 'when "cond2"',
														offset: 512,
														endOffset: 524,
														line: 35,
														endLine: 35,
														column: 4,
														endColumn: 16,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Tag',
																	name: 'p',
																	raw: 'p',
																	offset: 529,
																	endOffset: 530,
																	line: 36,
																	endLine: 36,
																	column: 5,
																	endColumn: 6,
																	block: {
																		type: 'Block',
																		nodes: [
																			{
																				type: 'Text',
																				raw: 'Condition 2\n\t\t\t',
																				offset: 531,
																				endOffset: 546,
																				line: 36,
																				endLine: 37,
																				column: 7,
																				endColumn: 4,
																			},
																		],
																		line: 36,
																	},
																	attrs: [],
																},
															],
															line: 36,
														},
													},
													{
														type: 'When',
														expr: '"cond3"',
														raw: 'when "cond3"',
														offset: 546,
														endOffset: 558,
														line: 37,
														endLine: 37,
														column: 4,
														endColumn: 16,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Tag',
																	name: 'p',
																	raw: 'p',
																	offset: 563,
																	endOffset: 564,
																	line: 38,
																	endLine: 38,
																	column: 5,
																	endColumn: 6,
																	block: {
																		type: 'Block',
																		nodes: [
																			{
																				type: 'Text',
																				raw: 'Condition 3\n\t\t\t',
																				offset: 565,
																				endOffset: 580,
																				line: 38,
																				endLine: 39,
																				column: 7,
																				endColumn: 4,
																			},
																		],
																		line: 38,
																	},
																	attrs: [],
																},
															],
															line: 38,
														},
													},
													{
														type: 'When',
														expr: 'default',
														raw: 'default',
														offset: 580,
														endOffset: 587,
														line: 39,
														endLine: 39,
														column: 4,
														endColumn: 11,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Tag',
																	name: 'p',
																	raw: 'p',
																	offset: 592,
																	endOffset: 593,
																	line: 40,
																	endLine: 40,
																	column: 5,
																	endColumn: 6,
																	block: {
																		type: 'Block',
																		nodes: [
																			{
																				type: 'Text',
																				raw: 'Default\n\t\t',
																				offset: 594,
																				endOffset: 604,
																				line: 40,
																				endLine: 41,
																				column: 7,
																				endColumn: 3,
																			},
																		],
																		line: 40,
																	},
																	attrs: [],
																},
															],
															line: 40,
														},
													},
												],
												line: 33,
											},
										},
										{
											type: 'Tag',
											name: 'script',
											raw: 'script',
											offset: 604,
											endOffset: 610,
											line: 41,
											endLine: 41,
											column: 3,
											endColumn: 9,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'console.log(123);',
														offset: 615,
														endOffset: 632,
														line: 42,
														endLine: 42,
														column: 4,
														endColumn: 21,
													},
												],
												line: 41,
											},
											attrs: [],
										},
										{
											type: 'Text',
											raw: '<script>alert(123)</script>',
											offset: 640,
											endOffset: 667,
											line: 44,
											endLine: 44,
											column: 4,
											endColumn: 31,
										},
										{
											type: 'Filter',
											name: 'any-filter',
											raw: ':any-filter(arg1 arg2 arg3=123)',
											offset: 670,
											endOffset: 701,
											line: 45,
											endLine: 45,
											column: 3,
											endColumn: 34,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'filter contents',
														offset: 705,
														endOffset: 720,
														line: 46,
														endLine: 46,
														column: 4,
														endColumn: 19,
													},
												],
												line: 45,
											},
											attrs: [
												{
													name: 'arg1',
													val: true,
													mustEscape: true,
													offset: 682,
													endOffset: 686,
													line: 45,
													endLine: 45,
													column: 15,
													endColumn: 19,
													raw: 'arg1',
												},
												{
													name: 'arg2',
													val: true,
													mustEscape: true,
													offset: 687,
													endOffset: 691,
													line: 45,
													endLine: 45,
													column: 20,
													endColumn: 24,
													raw: 'arg2',
												},
												{
													name: 'arg3',
													val: '123',
													mustEscape: true,
													offset: 692,
													endOffset: 700,
													line: 45,
													endLine: 45,
													column: 25,
													endColumn: 33,
													raw: 'arg3=123',
												},
											],
										},
									],
									line: 4,
								},
								attrs: [],
							},
						],
						line: 1,
					},
					attrs: [
						{
							name: 'lang',
							val: 'en',
							mustEscape: true,
							offset: 5,
							endOffset: 12,
							line: 1,
							endLine: 1,
							column: 6,
							endColumn: 13,
							raw: 'lang=en',
						},
					],
				},
			],
			line: 0,
		});
	});

	/**
	 * @see https://pugjs.org/language/mixins.html
	 */
	it('use mixin', () => {
		const ast = pugParse(`//- Declaration
mixin list
	ul
		li foo
		li bar
		li baz
//- Use
+list
+list

mixin article(title)
	.article
		.article-wrapper
			h1= title
			if block
				block
			else
				p No content provided

+article('Hello world')

+article('Hello world')
	p This is my
	p Amazing article

mixin link(href, name)
	//- attributes == {class: "btn"}
	a(class!=attributes.class href=href)= name

+link('/foo', 'foo')(class="btn")
`);
		// console.log(JSON.stringify(ast));
		expect(ast).toStrictEqual({
			type: 'Block',
			nodes: [
				{
					type: 'Comment',
					val: ' Declaration',
					buffer: false,
					raw: '//- Declaration',
					offset: 0,
					endOffset: 15,
					line: 1,
					endLine: 1,
					column: 1,
					endColumn: 16,
				},
				{
					type: 'Mixin',
					name: 'list',
					args: null,
					call: false,
					raw: 'mixin list',
					offset: 16,
					endOffset: 26,
					line: 2,
					endLine: 2,
					column: 1,
					endColumn: 11,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Tag',
								name: 'ul',
								raw: 'ul',
								offset: 28,
								endOffset: 30,
								line: 3,
								endLine: 3,
								column: 2,
								endColumn: 4,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Tag',
											name: 'li',
											raw: 'li',
											offset: 33,
											endOffset: 35,
											line: 4,
											endLine: 4,
											column: 3,
											endColumn: 5,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'foo',
														offset: 36,
														endOffset: 39,
														line: 4,
														endLine: 4,
														column: 6,
														endColumn: 9,
													},
												],
												line: 4,
											},
											attrs: [],
										},
										{
											type: 'Tag',
											name: 'li',
											raw: 'li',
											offset: 42,
											endOffset: 44,
											line: 5,
											endLine: 5,
											column: 3,
											endColumn: 5,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'bar',
														offset: 45,
														endOffset: 48,
														line: 5,
														endLine: 5,
														column: 6,
														endColumn: 9,
													},
												],
												line: 5,
											},
											attrs: [],
										},
										{
											type: 'Tag',
											name: 'li',
											raw: 'li',
											offset: 51,
											endOffset: 53,
											line: 6,
											endLine: 6,
											column: 3,
											endColumn: 5,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Text',
														raw: 'baz\n',
														offset: 54,
														endOffset: 58,
														line: 6,
														endLine: 7,
														column: 6,
														endColumn: 1,
													},
												],
												line: 6,
											},
											attrs: [],
										},
									],
									line: 3,
								},
								attrs: [],
							},
						],
						line: 3,
					},
					attrs: [],
				},
				{
					type: 'Comment',
					val: ' Use',
					buffer: false,
					raw: '',
					offset: 58,
					endOffset: 58,
					line: 7,
					endLine: 7,
					column: 1,
					endColumn: 1,
				},
				{
					type: 'Mixin',
					name: 'list',
					args: null,
					call: true,
					raw: '+list',
					offset: 66,
					endOffset: 71,
					line: 8,
					endLine: 8,
					column: 1,
					endColumn: 6,
					block: null,
					attrs: [],
				},
				{
					type: 'Mixin',
					name: 'list',
					args: null,
					call: true,
					raw: '+list',
					offset: 72,
					endOffset: 77,
					line: 9,
					endLine: 9,
					column: 1,
					endColumn: 6,
					block: null,
					attrs: [],
				},
				{
					type: 'Mixin',
					name: 'article',
					args: 'title',
					call: false,
					raw: 'mixin article(title)',
					offset: 79,
					endOffset: 99,
					line: 11,
					endLine: 11,
					column: 1,
					endColumn: 21,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Tag',
								name: 'div',
								raw: '.article',
								offset: 101,
								endOffset: 109,
								line: 12,
								endLine: 12,
								column: 2,
								endColumn: 10,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Tag',
											name: 'div',
											raw: '.article-wrapper',
											offset: 112,
											endOffset: 128,
											line: 13,
											endLine: 13,
											column: 3,
											endColumn: 19,
											block: {
												type: 'Block',
												nodes: [
													{
														type: 'Tag',
														name: 'h1',
														raw: 'h1',
														offset: 132,
														endOffset: 134,
														line: 14,
														endLine: 14,
														column: 4,
														endColumn: 6,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Code',
																	raw: '= title',
																	val: 'title',
																	buffer: true,
																	mustEscape: true,
																	isInline: true,
																	offset: 134,
																	endOffset: 141,
																	line: 14,
																	endLine: 14,
																	column: 6,
																	endColumn: 13,
																},
															],
															line: 14,
														},
														attrs: [],
													},
													{
														type: 'Conditional',
														raw: 'if block',
														test: 'block',
														offset: 145,
														endOffset: 153,
														line: 15,
														endLine: 15,
														column: 4,
														endColumn: 12,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'MixinBlock',
																	raw: 'block',
																	offset: 158,
																	endOffset: 163,
																	line: 16,
																	endLine: 16,
																	column: 5,
																	endColumn: 10,
																},
															],
															line: 16,
														},
													},
													{
														type: 'Conditional',
														raw: 'else',
														test: 'block',
														offset: 167,
														endOffset: 171,
														line: 17,
														endLine: 17,
														column: 4,
														endColumn: 8,
														block: {
															type: 'Block',
															nodes: [
																{
																	type: 'Tag',
																	name: 'p',
																	raw: 'p',
																	offset: 176,
																	endOffset: 177,
																	line: 18,
																	endLine: 18,
																	column: 5,
																	endColumn: 6,
																	block: {
																		type: 'Block',
																		nodes: [
																			{
																				type: 'Text',
																				raw: 'No content provided\n\n',
																				offset: 178,
																				endOffset: 199,
																				line: 18,
																				endLine: 20,
																				column: 7,
																				endColumn: 1,
																			},
																		],
																		line: 18,
																	},
																	attrs: [],
																},
															],
															line: 18,
														},
													},
												],
												line: 13,
											},
											attrs: [
												{
													name: 'class',
													val: "'article-wrapper'",
													mustEscape: false,
													offset: 112,
													endOffset: 128,
													line: 13,
													endLine: 13,
													column: 3,
													endColumn: 19,
													raw: '.article-wrapper',
												},
											],
										},
									],
									line: 12,
								},
								attrs: [
									{
										name: 'class',
										val: "'article'",
										mustEscape: false,
										offset: 101,
										endOffset: 109,
										line: 12,
										endLine: 12,
										column: 2,
										endColumn: 10,
										raw: '.article',
									},
								],
							},
						],
						line: 12,
					},
					attrs: [],
				},
				{
					type: 'Mixin',
					name: 'article',
					args: "'Hello world'",
					call: true,
					raw: "+article('Hello world')",
					offset: 199,
					endOffset: 222,
					line: 20,
					endLine: 20,
					column: 1,
					endColumn: 24,
					block: null,
					attrs: [],
				},
				{
					type: 'Mixin',
					name: 'article',
					args: "'Hello world'",
					call: true,
					raw: "+article('Hello world')",
					offset: 224,
					endOffset: 247,
					line: 22,
					endLine: 22,
					column: 1,
					endColumn: 24,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Tag',
								name: 'p',
								raw: 'p',
								offset: 249,
								endOffset: 250,
								line: 23,
								endLine: 23,
								column: 2,
								endColumn: 3,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Text',
											raw: 'This is my',
											offset: 251,
											endOffset: 261,
											line: 23,
											endLine: 23,
											column: 4,
											endColumn: 14,
										},
									],
									line: 23,
								},
								attrs: [],
							},
							{
								type: 'Tag',
								name: 'p',
								raw: 'p',
								offset: 263,
								endOffset: 264,
								line: 24,
								endLine: 24,
								column: 2,
								endColumn: 3,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Text',
											raw: 'Amazing article\n\n',
											offset: 265,
											endOffset: 282,
											line: 24,
											endLine: 26,
											column: 4,
											endColumn: 1,
										},
									],
									line: 24,
								},
								attrs: [],
							},
						],
						line: 22,
					},
					attrs: [],
				},
				{
					type: 'Mixin',
					name: 'link',
					args: 'href, name',
					call: false,
					raw: 'mixin link(href, name)',
					offset: 282,
					endOffset: 304,
					line: 26,
					endLine: 26,
					column: 1,
					endColumn: 23,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Comment',
								val: ' attributes == {class: "btn"}',
								buffer: false,
								raw: '//- attributes == {class: "btn"}',
								offset: 306,
								endOffset: 338,
								line: 27,
								endLine: 27,
								column: 2,
								endColumn: 34,
							},
							{
								type: 'Tag',
								name: 'a',
								raw: 'a(class!=attributes.class href=href)',
								offset: 340,
								endOffset: 376,
								line: 28,
								endLine: 28,
								column: 2,
								endColumn: 38,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Code',
											raw: '= name',
											val: 'name',
											buffer: true,
											mustEscape: true,
											isInline: true,
											offset: 376,
											endOffset: 382,
											line: 28,
											endLine: 28,
											column: 38,
											endColumn: 44,
										},
									],
									line: 28,
								},
								attrs: [
									{
										name: 'class',
										val: 'attributes.class',
										mustEscape: false,
										offset: 342,
										endOffset: 365,
										line: 28,
										endLine: 28,
										column: 4,
										endColumn: 27,
										raw: 'class!=attributes.class',
									},
									{
										name: 'href',
										val: 'href',
										mustEscape: true,
										offset: 366,
										endOffset: 375,
										line: 28,
										endLine: 28,
										column: 28,
										endColumn: 37,
										raw: 'href=href',
									},
								],
							},
						],
						line: 27,
					},
					attrs: [],
				},
				{
					type: 'Mixin',
					name: 'link',
					args: "'/foo', 'foo'",
					call: true,
					raw: "+link('/foo', 'foo')",
					offset: 384,
					endOffset: 404,
					line: 30,
					endLine: 30,
					column: 1,
					endColumn: 21,
					block: null,
					attrs: [],
				},
			],
			line: 0,
		});
	});

	it('use mixin', () => {
		const ast = pugParse(`div
	<span>
		<img src="path/to">
	</span>
`);
		// console.log(JSON.stringify(ast));
		expect(ast).toStrictEqual({
			type: 'Block',
			nodes: [
				{
					type: 'Tag',
					name: 'div',
					raw: 'div',
					offset: 0,
					endOffset: 3,
					line: 1,
					endLine: 1,
					column: 1,
					endColumn: 4,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Text',
								raw: '<span>\n\t\t<img src="path/to">\n\t</span>\n',
								offset: 5,
								endOffset: 43,
								line: 2,
								endLine: 5,
								column: 2,
								endColumn: 1,
							},
						],
						line: 1,
					},
					attrs: [],
				},
			],
			line: 0,
		});
	});

	it('tag interpolation (Issue #58)', () => {
		const ast = pugParse(`p
	| lorem #[span ipsum]`);
		expect(ast).toStrictEqual({
			type: 'Block',
			nodes: [
				{
					type: 'Tag',
					name: 'p',
					raw: 'p',
					offset: 0,
					endOffset: 1,
					line: 1,
					endLine: 1,
					column: 1,
					endColumn: 2,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Text',
								raw: 'lorem ',
								offset: 5,
								endOffset: 11,
								line: 2,
								endLine: 2,
								column: 4,
								endColumn: 10,
							},
							{
								type: 'Tag',
								name: 'span',
								raw: 'span',
								offset: 13,
								endOffset: 17,
								line: 2,
								endLine: 2,
								column: 12,
								endColumn: 16,
								block: {
									type: 'Block',
									nodes: [
										{
											type: 'Text',
											raw: 'ipsum',
											offset: 18,
											endOffset: 23,
											line: 2,
											endLine: 2,
											column: 17,
											endColumn: 22,
										},
									],
									line: 2,
								},
								attrs: [],
							},
							// A cause of issue #58
							{
								type: 'Text',
								raw: '',
								offset: 24,
								endOffset: 24,
								line: 2,
								endLine: 2,
								column: 23,
								endColumn: 23,
							},
						],
						line: 1,
					},
					attrs: [],
				},
			],
			line: 0,
		});
	});

	it('block-in-tag', () => {
		const ast = pugParse(`div.
	#text
	<img tag>
	<span>
		#text2
	</span>`);
		// console.log(JSON.stringify(ast));
		expect(ast).toStrictEqual({
			type: 'Block',
			nodes: [
				{
					type: 'Tag',
					name: 'div',
					raw: 'div',
					offset: 0,
					endOffset: 3,
					line: 1,
					endLine: 1,
					column: 1,
					endColumn: 4,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Text',
								raw: '\n\t#text\n\t<img tag>\n\t<span>\n\t\t#text2\n\t</span>',
								offset: 4,
								endOffset: 48,
								line: 1,
								endLine: 6,
								column: 5,
								endColumn: 9,
							},
						],
						line: 1,
					},
					attrs: [],
				},
			],
			line: 0,
		});
	});

	it('block-in-tag', () => {
		const ast = pugParse(`div.
	<input invalid-attr/>
	<input invalid-attr/>`);
		// console.log(JSON.stringify(ast));
		expect(ast).toStrictEqual({
			type: 'Block',
			nodes: [
				{
					type: 'Tag',
					name: 'div',
					raw: 'div',
					offset: 0,
					endOffset: 3,
					line: 1,
					endLine: 1,
					column: 1,
					endColumn: 4,
					block: {
						type: 'Block',
						nodes: [
							{
								type: 'Text',
								raw: '\n\t<input invalid-attr/>\n\t<input invalid-attr/>',
								offset: 4,
								endOffset: 50,
								line: 1,
								endLine: 3,
								column: 5,
								endColumn: 23,
							},
						],
						line: 1,
					},
					attrs: [],
				},
			],
			line: 0,
		});
	});
});
