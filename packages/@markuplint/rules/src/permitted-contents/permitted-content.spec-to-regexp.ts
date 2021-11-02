import {
	ContentModel,
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
import { rePCENChar } from '../helpers';
import unfoldContentModelsToTags from './unfold-content-models-to-tags';

const ALL = '(?:<[^>]+>)?';
const ___TRANSPARENT___ = '___TRANSPARENT___';
const ___InTRANSPARENT = '___InTRANSPARENT';
const CUSTOM_ELEMENT = `(?:<[a-z](?:${rePCENChar})*\\-(?:${rePCENChar})*>)`;

export default class ExpGenerator {
	private _idCounter = 0;

	constructor(private _id: number) {}

	public specToRegExp(
		contentRule: PermittedContent[] | boolean,
		parentExp: RegExp | null = null,
		ownNS: string | null = null,
	) {
		if (contentRule === true) {
			return new RegExp(`^(?:${ALL})$`);
		}
		if (contentRule === false) {
			return new RegExp('^$');
		}
		const parentPattern = parentExp ? parentExp.source.replace(/^\^|\$$/g, '') : ALL;
		const pattern = this._toPattern(contentRule, null, ownNS, 1, 1).replace(
			___TRANSPARENT___,
			() => `(?<TRANSPARENT_${this._id}${this._idCounter++}>${parentPattern})`,
		);

		return new RegExp(`^${pattern}$`, 'i');
	}

	private _toPattern(
		contentRule: Target | PermittedContent[],
		ignore: Target | null,
		ownNS: string | null,
		min: number,
		max: number,
	) {
		if (isTarget(contentRule)) {
			return this._targetTags(contentRule, ignore, ownNS, min, max);
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
					ownNS,
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
				pattern = this._targetTags(nodeRule.optional, nodeRule.ignore || null, ownNS, 0, nodeRule.max || 1);
			} else if (isOneOrMoreContents(nodeRule)) {
				if (nodeRule.notAllowedDescendants) {
					notAllowedDescendantsNamedCapture = nodeRule.notAllowedDescendants
						.map(r => r.replace('#', '_'))
						.join('_');
					if (nodeRule.oneOrMore === '#transparent') {
						notAllowedDescendantsNamedCapture += `${___InTRANSPARENT}`;
					}
				}
				pattern = this._toPattern(
					nodeRule.oneOrMore,
					nodeRule.ignore || null,
					ownNS,
					1,
					nodeRule.max || Infinity,
				);
			} else if (isZeroOrMoreContents(nodeRule)) {
				if (nodeRule.notAllowedDescendants) {
					notAllowedDescendantsNamedCapture = nodeRule.notAllowedDescendants
						.map(r => r.replace('#', '_'))
						.join('_');
					if (nodeRule.zeroOrMore === '#transparent') {
						notAllowedDescendantsNamedCapture += `${___InTRANSPARENT}`;
					}
				}
				pattern = this._toPattern(
					nodeRule.zeroOrMore,
					nodeRule.ignore || null,
					ownNS,
					0,
					nodeRule.max || Infinity,
				);
			} else if (isChoiceContents(nodeRule)) {
				pattern = `(?:${nodeRule.choice.map(choice => this._toPattern(choice, null, ownNS, 1, 1)).join('|')})`;
			} else if (isInterleaveContents(nodeRule)) {
				pattern = this._interleavePattern(nodeRule.interleave, ownNS);
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

	private _interleavePattern(contents: PermittedContent[][], ownNS: string | null) {
		const interleave = contents.map(content => this._toPattern(content, null, ownNS, 1, 1));
		const patterns = combination(interleave).map((pattern, i) =>
			pattern.join('').replace(/(\(\?<[A-Z]+_)([0-9]+)_/g, ($0, $1, $2) => `${$1}${$2}${i}_`),
		);
		return join(patterns);
	}

	private _targetTags(target: Target, ignore: Target | null, ownNS: string | null, min: number, max: number) {
		const tagList = this._resolveTags(target, ownNS);
		const ignoreList = ignore ? this._resolveTags(ignore, ownNS) : null;

		if (ignoreList) {
			ignoreList.forEach(ignore => tagList.delete(ignore));
		}

		return join(Array.from(tagList), createRange(min, max));
	}

	private _resolveTags(target: Target, ownNS: string | null) {
		const list = Array.isArray(target) ? target : [target];
		const tagList = new TagList();

		for (const name of list) {
			if (name !== '#text' && name[0] === '#') {
				switch (name) {
					case '#transparent': {
						tagList.addPattern(___TRANSPARENT___);
						break;
					}
					case '#custom': {
						tagList.addPattern(CUSTOM_ELEMENT);
						break;
					}
					default: {
						const selectors = unfoldContentModelsToTags(name as ContentModel);
						const counter = this._idCounter++;
						selectors.forEach(selector => {
							if (selector === '#custom') {
								tagList.addPattern(CUSTOM_ELEMENT);
								return;
							}
							if (/]$/i.test(selector)) {
								const [, tagName] = /^([^[\]]+)\[[^\]]+\]$/.exec(selector) || [];
								// ACM = Attributes by content model
								const exp = `(?<ACM_${this._id}${counter}_${name.slice(1)}_${tagName}><${tagName}>)`;
								tagList.addPattern(exp);
								return;
							}
							tagList.addTag(selector, ownNS);
						});
					}
				}
				continue;
			}
			tagList.addTag(name, ownNS);
		}

		return tagList.result();
	}
}

class TagList {
	#list = new Set<string>();

	addPattern(pattern: string) {
		this.#list.add(pattern);
	}

	addTag(tagNameOrSelector: string, ownNS: string | null) {
		if (ownNS) {
			tagNameOrSelector = tagNameOrSelector.replace(new RegExp(`^${ownNS}:`, 'i'), '');
		}
		this.#list.add(`<${tagNameOrSelector}>`);
	}

	result() {
		return this.#list;
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
