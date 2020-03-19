import { ElementCloseTag, Result, createRule } from '@markuplint/ml-core';

export type Value = 'tab' | number;
export interface IndentationOptions {
	alignment: boolean;
	'indent-nested-nodes': boolean | 'always' | 'never';
}

export default createRule<Value, IndentationOptions>({
	name: 'indentation',
	defaultLevel: 'warning',
	defaultValue: 2,
	defaultOptions: {
		alignment: true,
		'indent-nested-nodes': true,
	},
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walk(async node => {
			if (node.rule.disabled) {
				return;
			}

			// console.log(`${node.type}(${'nodeName' in node ? node.nodeName : ''}):\t"${node.raw}"`);
			if (node.indentation) {
				/**
				 * Validate indent type and length.
				 */
				if (node.indentation.type !== 'none') {
					const ms = node.rule.severity === 'error' ? 'must' : 'should';
					let spec: string | null = null;
					if (node.rule.value === 'tab' && node.indentation.type !== 'tab') {
						spec = 'tab';
					} else if (typeof node.rule.value === 'number' && node.indentation.type !== 'space') {
						spec = 'space';
					} else if (
						typeof node.rule.value === 'number' &&
						node.indentation.type === 'space' &&
						node.indentation.width % node.rule.value
					) {
						spec = messages('{0} width spaces', `${node.rule.value}`);
					}
					if (spec) {
						const message = messages(`{0} ${ms} be {1}`, 'Indentation', spec);
						reports.push({
							severity: node.rule.severity,
							message,
							line: node.indentation.line,
							col: 1,
							raw: node.indentation.raw,
						});
						return;
					}
				}

				/**
				 * Validate nested parent-children nodes.
				 */
				const nested = node.rule.option['indent-nested-nodes'];
				if (!nested) {
					return;
				}
				const parent = node.syntaxicalParentNode;
				if (parent) {
					const parentIndentWidth = parent.indentation ? parent.indentation.width : 0;
					const childIndentWidth = node.indentation.width;
					const expectedWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
					const diff = childIndentWidth - parentIndentWidth;
					// console.log({
					// 	[parent.raw]: parent.indentation ? parent.indentation.width : 0,
					// 	[node.raw]: node.indentation.width,
					// 	rule: node.rule,
					// 	parentIndentWidth,
					// 	childIndentWidth,
					// 	expectedWidth,
					// 	diff,
					// 	nested,
					// });
					if (nested === 'never') {
						if (diff !== 0) {
							const message = messages(
								diff < 1 ? 'Should increase indentation' : 'Should decrease indentation',
							);
							reports.push({
								severity: node.rule.severity,
								message,
								line: node.indentation.line,
								col: 1,
								raw: node.indentation.raw,
							});
						}
					} else {
						if (diff !== expectedWidth) {
							const message = messages(
								diff < 1 ? 'Should increase indentation' : 'Should decrease indentation',
							);
							reports.push({
								severity: node.rule.severity,
								message,
								line: node.indentation.line,
								col: 1,
								raw: node.indentation.raw,
							});
						}
					}
				}
			}

			/**
			 * Validate alignment end-tags.
			 */
			if (node instanceof ElementCloseTag) {
				const closeTag = node;
				const startTag = closeTag.startTag;
				if (!closeTag.rule.option.alignment) {
					return;
				}

				if (!closeTag.indentation) {
					return;
				}

				if (startTag.endLine === closeTag.endLine) {
					return;
				}

				const endTagIndentationWidth = closeTag.indentation ? closeTag.indentation.width : 0;
				const startTagIndentationWidth = startTag.indentation ? startTag.indentation.width : 0;

				// console.log({
				// 	[`${startTag}`]: startTagIndentationWidth,
				// 	[`${closeTag}`]: endTagIndentationWidth,
				// });

				if (startTagIndentationWidth !== endTagIndentationWidth) {
					const message = messages('Start tag and end tag indentation should align');
					reports.push({
						severity: closeTag.rule.severity,
						message,
						line: closeTag.indentation ? closeTag.indentation.line : closeTag.startLine,
						col: 1,
						raw: closeTag.indentation ? closeTag.indentation.raw : '',
					});
				}
			}
		});

		return reports;
	},
	async fix(document) {
		/**
		 * Validate indent type and length.
		 */
		await document.walk(async node => {
			if (!node.rule.disabled && node.indentation) {
				if (node.indentation.type !== 'none') {
					const spec = node.rule.value === 'tab' ? '\t' : ' ';
					const baseWidth = node.rule.value === 'tab' ? 4 : node.rule.value;
					let width: number;
					if (node.rule.value === 'tab') {
						width =
							node.indentation.type === 'tab'
								? node.indentation.width
								: Math.ceil(node.indentation.width / baseWidth);
					} else {
						width =
							node.indentation.type === 'tab'
								? node.indentation.width * baseWidth
								: Math.ceil(node.indentation.width / baseWidth) * baseWidth;
					}
					const raw = node.indentation.raw;
					const fixed = spec.repeat(width);
					// console.log({spec, width});
					if (raw !== fixed) {
						// console.log('step1', {
						// 	raw: space(raw),
						// 	fix: space(fixed),
						// });
						node.indentation.fix(fixed);
					}
				}
			}
		});

		await document.walk(async node => {
			if (node.rule.disabled) {
				return;
			}
			if (node.indentation) {
				/**
				 * Validate nested parent-children nodes.
				 */
				const nested = node.rule.option['indent-nested-nodes'];
				if (!nested) {
					return;
				}
				if (node.parentNode) {
					const parent = node.syntaxicalParentNode;
					// console.log(node.raw, parent);
					if (parent && parent.indentation) {
						const parentIndentWidth = parent.indentation.width;
						const childIndentWidth = node.indentation.width;
						const expectedWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
						const diff = childIndentWidth - parentIndentWidth;
						// console.log({ parentIndentWidth, childIndentWidth, expectedWidth, diff });
						if (nested === 'never') {
							if (diff !== 0) {
								// const message = messages(diff < 1 ? `インデントを下げてください` : `インデントを上げてください`);
								// const raw = node.indentation.raw;
								const fixed = parent.indentation.raw;
								// console.log('step2-A', {
								// 	raw: space(raw),
								// 	fix: space(fixed),
								// });
								node.indentation.fix(fixed);
							}
						} else {
							if (diff !== expectedWidth) {
								// const message = messages(diff < 1 ? `インデントを下げてください` : `インデントを上げてください`);
								// const raw = node.indentation.raw;
								const fixed = (node.rule.value === 'tab' ? '\t' : ' ').repeat(
									parentIndentWidth + expectedWidth,
								);
								// console.log('step2-B', {
								// 	raw: space(raw),
								// 	fix: space(fixed),
								// });
								node.indentation.fix(fixed);
							}
						}
					}
				}
			}
		});

		/**
		 * Validate alignment end-tags.
		 */
		await document.walkOn('ElementCloseTag', async endTag => {
			if (!endTag.rule || !endTag.rule.option) {
				return;
			}
			if (!endTag.rule.option.alignment) {
				return;
			}
			if (endTag.indentation && endTag.startTag.indentation) {
				const endTagIndentationWidth = endTag.indentation.width;
				const startTagIndentationWidth = endTag.startTag.indentation.width;
				if (startTagIndentationWidth !== endTagIndentationWidth) {
					// const raw = endTag.indentation.raw;
					const fixed = endTag.startTag.indentation.raw;
					// console.log('step3', {
					// 	raw: space(raw),
					// 	fix: space(fixed),
					// });
					endTag.indentation.fix(fixed);
				}
			}
		});
	},
});

// function space(str: string) {
// 	return str.replace(/ /g, $0 => '•').replace(/\t/g, $0 => '→   ');
// }
