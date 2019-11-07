import {
	PermittedContent,
	PermittedContentChoice,
	PermittedContentInterleave,
	PermittedContentOneOrMore,
	PermittedContentOptional,
	PermittedContentRequire,
	PermittedContentZeroOrMore,
	Target,
} from '@markuplint/ml-spec';
import combination from './array.combination';
import unfoldContentModelsToTags from './unfold-content-models-to-tags';

const ALL = '<[^>]+>';
const ___TRANSPARENT___ = '___TRANSPARENT___';
const ___InTRANSPARENT = '___InTRANSPARENT';

/**
 * PotentialCustomElementName
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 */
const rePCENChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');
const CUSTOM_ELEMENT = `(?:<[a-z](?:${rePCENChar})*\\-(?:${rePCENChar})*>)`;

export default class ExpGenerator {
	private _idCounter = 0;

	constructor(private _id: number) {}

	public specToRegExp(contentRule: PermittedContent[] | boolean, parentExp: RegExp | null = null) {
		if (contentRule === true) {
			return new RegExp(`^(?:${ALL})$`);
		}
		if (contentRule === false) {
			return new RegExp('^$');
		}
		const parentPattern = parentExp ? parentExp.source.replace(/^\^|\$$/g, '') : ALL;
		const pattern = this._toPattern(contentRule, null, 1, 1).replace(
			___TRANSPARENT___,
			() => `(?<TRANSPARENT_${this._id}${this._idCounter++}>${parentPattern})`,
		);

		return new RegExp(`^${pattern}$`, 'i');
	}

	private _toPattern(contentRule: Target | PermittedContent[], ignore: Target | null, min: number, max: number) {
		if (isTarget(contentRule)) {
			return this._targetTags(contentRule, ignore, min, max);
		}
		let notAllowedDescendantsNamedCapture = '';
		const exp: string[] = [];
		for (const nodeRule of contentRule) {
			let pattern = '';
			if (isRequiredContents(nodeRule)) {
				if (nodeRule.notAllowedDescendants) {
					notAllowedDescendantsNamedCapture = nodeRule.notAllowedDescendants
						.map(r => r.replace('#', '_'))
						.join('_');
					if (nodeRule.require === '#transparent') {
						notAllowedDescendantsNamedCapture += `${___InTRANSPARENT}`;
					}
				}
				pattern = this._targetTags(
					nodeRule.require,
					nodeRule.ignore || null,
					nodeRule.min || 1,
					nodeRule.max || nodeRule.min || 1,
				);
			} else if (isOptionalContents(nodeRule)) {
				if (nodeRule.notAllowedDescendants) {
					notAllowedDescendantsNamedCapture = nodeRule.notAllowedDescendants
						.map(r => r.replace('#', '_'))
						.join('_');
					if (nodeRule.optional === '#transparent') {
						notAllowedDescendantsNamedCapture += `${___InTRANSPARENT}`;
					}
				}
				pattern = this._targetTags(nodeRule.optional, nodeRule.ignore || null, 0, nodeRule.max || 1);
			} else if (isOneOrMoreContents(nodeRule)) {
				if (nodeRule.notAllowedDescendants) {
					notAllowedDescendantsNamedCapture = nodeRule.notAllowedDescendants
						.map(r => r.replace('#', '_'))
						.join('_');
					if (nodeRule.oneOrMore === '#transparent') {
						notAllowedDescendantsNamedCapture += `${___InTRANSPARENT}`;
					}
				}
				pattern = this._toPattern(nodeRule.oneOrMore, nodeRule.ignore || null, 1, nodeRule.max || Infinity);
			} else if (isZeroOrMoreContents(nodeRule)) {
				if (nodeRule.notAllowedDescendants) {
					notAllowedDescendantsNamedCapture = nodeRule.notAllowedDescendants
						.map(r => r.replace('#', '_'))
						.join('_');
					if (nodeRule.zeroOrMore === '#transparent') {
						notAllowedDescendantsNamedCapture += `${___InTRANSPARENT}`;
					}
				}
				pattern = this._toPattern(nodeRule.zeroOrMore, nodeRule.ignore || null, 0, nodeRule.max || Infinity);
			} else if (isChoiceContents(nodeRule)) {
				pattern = `(?:${nodeRule.choice.map(choice => this._toPattern(choice, null, 1, 1)).join('|')})`;
			} else if (isInterleaveContents(nodeRule)) {
				pattern = this._interleavePattern(nodeRule.interleave);
			}
			exp.push(pattern);
		}
		const range = createRange(min, max);
		const c = notAllowedDescendantsNamedCapture
			? `?<NAD_${this._id}${this._idCounter++}_${notAllowedDescendantsNamedCapture}>`
			: '?:';
		if (1 === exp.length && range === '') {
			if (notAllowedDescendantsNamedCapture) {
				return `(${c}${exp[0]})`;
			}
			return exp[0];
		}
		if (range === '') {
			if (notAllowedDescendantsNamedCapture) {
				return `(${c}${exp.join('')})`;
			}
			return exp.join('');
		}
		return `(${c}${exp.join('')})${range}`;
	}

	private _interleavePattern(contents: PermittedContent[][]) {
		const interleave = contents.map(content => this._toPattern(content, null, 1, 1));
		const patterns = combination(interleave).map((pattern, i) =>
			pattern.join('').replace(/(\(\?<[A-Z]+_)([0-9]+)_/g, ($0, $1, $2) => `${$1}${$2}${i}_`),
		);
		return join(patterns);
	}

	private _targetTags(target: Target, ignore: Target | null, min: number, max: number) {
		const tagList = this._resolveTags(target);
		const ignoreList = ignore ? this._resolveTags(ignore) : null;

		if (ignoreList) {
			ignoreList.forEach(ignore => tagList.delete(ignore));
		}

		return join(Array.from(tagList), createRange(min, max));
	}

	private _resolveTags(target: Target) {
		const list = Array.isArray(target) ? target : [target];
		const tagList: Set<string> = new Set();

		for (const name of list) {
			if (name !== '#text' && name[0] === '#') {
				switch (name) {
					case '#transparent': {
						tagList.add(___TRANSPARENT___);
						break;
					}
					case '#custom': {
						tagList.add(CUSTOM_ELEMENT);
						break;
					}
					default: {
						const selectors = unfoldContentModelsToTags(name);
						const counter = this._idCounter++;
						selectors.forEach(selector => {
							if (selector === '#custom') {
								tagList.add(CUSTOM_ELEMENT);
								return;
							}
							if (/]$/i.test(selector)) {
								const [, tagName] = /^([^[\]]+)\[[^\]]+\]$/.exec(selector) || [];
								// ACM = Attributes by comtent model
								const exp = `(?<ACM_${this._id}${counter}_${name.slice(1)}_${tagName}><${tagName}>)`;
								tagList.add(exp);
								return;
							}
							tagList.add(`<${selector}>`);
						});
					}
				}
				continue;
			}
			tagList.add(`<${name}>`);
		}

		return tagList;
	}
}

function isRequiredContents(contents: PermittedContent): contents is PermittedContentRequire {
	return 'require' in contents;
}

function isOptionalContents(contents: PermittedContent): contents is PermittedContentOptional {
	return 'optional' in contents;
}

function isOneOrMoreContents(contents: PermittedContent): contents is PermittedContentOneOrMore {
	return 'oneOrMore' in contents;
}

function isZeroOrMoreContents(contents: PermittedContent): contents is PermittedContentZeroOrMore {
	return 'zeroOrMore' in contents;
}

function isChoiceContents(contents: PermittedContent): contents is PermittedContentChoice {
	return 'choice' in contents;
}

function isInterleaveContents(contents: PermittedContent): contents is PermittedContentInterleave {
	return 'interleave' in contents;
}

function createRange(min: number, max: number) {
	let result = `{${min},${max}}`;
	switch (result) {
		case '{0,1}':
			result = '?';
			break;
		case '{1,1}':
			result = '';
			break;
		case '{0,Infinity}':
			result = '*';
			break;
		case '{1,Infinity}':
			result = '+';
			break;
	}
	return result;
}

function isTarget(contentRule: Target | PermittedContent[]): contentRule is Target {
	if (typeof contentRule === 'string') {
		return true;
	}
	return contentRule.some((i: string | PermittedContent) => typeof i === 'string');
}

function join(pattern: string[], range = '') {
	if (1 === pattern.length && range === '') {
		return pattern[0];
	}
	return `(?:${pattern.join('|')})${range}`;
}
