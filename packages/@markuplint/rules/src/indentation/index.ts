import { ElementCloseTag, createRule, getIndent } from '@markuplint/ml-core';

export type Value = 'tab' | number;
export interface IndentationOptions {
	alignment?: boolean;
	'indent-nested-nodes'?: boolean | 'always' | 'never';
}

export default createRule<Value, IndentationOptions>({
	defaultServerity: 'warning',
	defaultValue: 2,
	defaultOptions: {
		alignment: true,
		'indent-nested-nodes': true,
	},
	async verify(context) {
		await context.document.walk(async node => {
			if (node.rule.disabled) {
				return;
			}

			const indent = getIndent(node);

			if (indent) {
				/**
				 * Validate indent type and length.
				 */
				if (indent.type !== 'none') {
					const ms = node.rule.severity === 'error' ? 'must' : 'should';
					let spec: string | null = null;
					if (node.rule.value === 'tab' && indent.type !== 'tab') {
						spec = 'tab';
					} else if (typeof node.rule.value === 'number' && indent.type !== 'space') {
						spec = 'space';
					} else if (
						typeof node.rule.value === 'number' &&
						indent.type === 'space' &&
						indent.width % node.rule.value
					) {
						spec = context.translate('{0} width spaces', `${node.rule.value}`);
					}
					if (spec) {
						const message = context.translate(`{0} ${ms} be {1}`, 'Indentation', spec);
						context.report({
							scope: node,
							message,
							line: indent.line,
							col: 1,
							raw: indent.raw,
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
					const parentIndent = getIndent(parent);
					const parentIndentWidth = parentIndent ? parentIndent.width : 0;
					const childIndentWidth = indent.width;
					const expectedWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
					const diff = childIndentWidth - parentIndentWidth;

					if (nested === 'never') {
						if (diff !== 0) {
							const message = context.translate(
								diff < 1 ? 'Should increase indentation' : 'Should decrease indentation',
							);
							context.report({
								scope: node,
								message,
								line: indent.line,
								col: 1,
								raw: indent.raw,
							});
						}
					} else {
						if (diff !== expectedWidth) {
							const message = context.translate(
								diff < 1 ? 'Should increase indentation' : 'Should decrease indentation',
							);
							context.report({
								scope: node,
								message,
								line: indent.line,
								col: 1,
								raw: indent.raw,
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

				const closeTagIndent = getIndent(closeTag);

				if (!closeTagIndent) {
					return;
				}

				if (startTag.endLine === closeTag.endLine) {
					return;
				}

				const startTagIndent = getIndent(startTag);
				const endTagIndentationWidth = closeTagIndent ? closeTagIndent.width : 0;
				const startTagIndentationWidth = startTagIndent ? startTagIndent.width : 0;

				if (startTagIndentationWidth !== endTagIndentationWidth) {
					const message = context.translate('Start tag and end tag indentation should align');
					context.report({
						scope: closeTag,
						message,
						line: closeTagIndent ? closeTagIndent.line : closeTag.startLine,
						col: 1,
						raw: closeTagIndent ? closeTagIndent.raw : '',
					});
				}
			}
		});
	},
	async fix({ document }) {
		/**
		 * Validate indent type and length.
		 */
		await document.walk(async node => {
			const indent = getIndent(node);
			if (!node.rule.disabled && indent) {
				if (indent.type !== 'none') {
					const spec = node.rule.value === 'tab' ? '\t' : ' ';
					const baseWidth = node.rule.value === 'tab' ? 4 : node.rule.value;
					let width: number;
					if (node.rule.value === 'tab') {
						width = indent.type === 'tab' ? indent.width : Math.ceil(indent.width / baseWidth);
					} else {
						width =
							indent.type === 'tab'
								? indent.width * baseWidth
								: Math.ceil(indent.width / baseWidth) * baseWidth;
					}
					const raw = indent.raw;
					const fixed = spec.repeat(width);
					if (raw !== fixed) {
						indent.fix(fixed);
					}
				}
			}
		});

		await document.walk(async node => {
			if (node.rule.disabled) {
				return;
			}
			const indent = getIndent(node);
			if (indent) {
				/**
				 * Validate nested parent-children nodes.
				 */
				const nested = node.rule.option['indent-nested-nodes'];
				if (!nested) {
					return;
				}
				const parent = node.syntaxicalParentNode;
				if (!parent) {
					return;
				}
				const parentIndent = getIndent(parent);
				if (!parentIndent) {
					return;
				}
				const parentIndentWidth = parentIndent.width;
				const childIndentWidth = indent.width;
				const expectedWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
				const diff = childIndentWidth - parentIndentWidth;
				if (nested === 'never') {
					if (diff !== 0) {
						const fixed = parentIndent.raw;
						indent.fix(fixed);
					}
				} else {
					if (diff !== expectedWidth) {
						const fixed = (node.rule.value === 'tab' ? '\t' : ' ').repeat(
							parentIndentWidth + expectedWidth,
						);
						indent.fix(fixed);
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
			const endTagIndent = getIndent(endTag);
			const startTagIndent = getIndent(endTag.startTag);
			if (endTagIndent && startTagIndent) {
				const endTagIndentationWidth = endTagIndent.width;
				const startTagIndentationWidth = startTagIndent.width;
				if (startTagIndentationWidth !== endTagIndentationWidth) {
					const fixed = startTagIndent.raw;
					endTagIndent.fix(fixed);
				}
			}
		});
	},
});
