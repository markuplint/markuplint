import { Result, createRule } from '@markuplint/ml-core';

type TagRule = {
	tag: string;
	contents: Contents[];
};

type Contents = Required | Optional | OneOrMore | ZeroOrMore | Choice;

type Required = {
	require: string;
	min?: number;
	max?: number;
};

type Optional = {
	optional: string;
	max?: number;
};

type OneOrMore = {
	oneOrMore: string;
	max?: number;
};

type ZeroOrMore = {
	zeroOrMore: string;
	max?: number;
};

type Choice = {
	choice: Contents[];
};

export default createRule<boolean, TagRule[]>({
	name: 'permitted-contents',
	defaultValue: true,
	defaultOptions: [],
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async node => {
			if (!node.rule.value) {
				return;
			}
			// console.log(node.rule.option);
			for (const rule of node.rule.option) {
				if (rule.tag.toLowerCase() !== node.nodeName.toLowerCase()) {
					continue;
				}

				const childElementsAndTextOrigin = Object.freeze(node.getChildElementsAndTextNodeWithoutWhitespaces());

				/**
				 * @mutable
				 */
				const childElementsAndText = [...childElementsAndTextOrigin];

				for (const ruleContent of rule.contents) {
					let permittedTag: string | null = null;
					let min = 0;
					let max = Infinity;
					let numPrefix = '';
					if (isRequiredContents(ruleContent)) {
						permittedTag = ruleContent.require;
						min = ruleContent.min || 1;
						max = ruleContent.max || 1;
					} else if (isOptionalContents(ruleContent)) {
						permittedTag = ruleContent.optional;
						min = 0;
						max = ruleContent.max || 1;
					} else if (isOneOrMoreContents(ruleContent)) {
						permittedTag = ruleContent.oneOrMore;
						min = 1;
						max = ruleContent.max || Infinity;
						numPrefix = 'one or more ';
					} else if (isZeroOrMoreContents(ruleContent)) {
						permittedTag = ruleContent.zeroOrMore;
						min = 0;
						max = ruleContent.max || Infinity;
					}

					if (!permittedTag) {
						continue;
					}

					const childElementsAndTextNameList = childElementsAndText.map(node =>
						node.type === 'Element' ? node.nodeName.toLowerCase() : '#text',
					);

					let count = 0;
					for (const childElemName of childElementsAndTextNameList) {
						if (childElemName === permittedTag) {
							count++;
							continue;
						}
						break;
					}
					// console.log({ childElementsAndTextNameList, count });

					if (count < min) {
						reports.push({
							severity: node.rule.severity,
							message: messages(
								`Invalid content, Require ${numPrefix}"${permittedTag}" element${
									!numPrefix && 1 < min ? ` at least ${min}` : ''
								}`,
							),
							line: node.startLine,
							col: node.startCol,
							raw: node.raw,
						});
					}

					if (count > max) {
						reports.push({
							severity: node.rule.severity,
							message: messages(
								`Invalid content, The maximum length of "${permittedTag}" elements is ${max}`,
							),
							line: node.startLine,
							col: node.startCol,
							raw: node.raw,
						});
					}

					childElementsAndText.splice(0, count);
				}

				if (childElementsAndText[0]) {
					// console.log(childElementsAndText);
					const el = childElementsAndText[0];
					const name = el.type === 'Element' ? el.nodeName : 'TextNode';
					reports.push({
						severity: node.rule.severity,
						message: messages(`Invalid contents, "${node.nodeName}" is unpermitted to contain "${name}"`),
						line: el.startLine,
						col: el.startCol,
						raw: el.raw,
					});
				}
			}
		});
		return reports;
	},
});

function isRequiredContents(contents: Contents): contents is Required {
	return 'require' in contents;
}

function isOptionalContents(contents: Contents): contents is Optional {
	return 'optional' in contents;
}

function isOneOrMoreContents(contents: Contents): contents is OneOrMore {
	return 'oneOrMore' in contents;
}

function isZeroOrMoreContents(contents: Contents): contents is ZeroOrMore {
	return 'zeroOrMore' in contents;
}

// function isChoiceContents(contents: Contents): contents is Choice {
// 	return 'choice' in contents;
// }
