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
			return targetTags(contentRule, ignore, min, max);
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
				pattern = targetTags(
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
				pattern = targetTags(nodeRule.optional, nodeRule.ignore || null, 0, nodeRule.max || 1);
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
		const patterns = combination(interleave).map(pattern => pattern.join(''));
		return join(patterns);
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

function resolveTags(target: Target) {
	const list = Array.isArray(target) ? target : [target];
	const tagList: Set<string> = new Set();

	for (const name of list) {
		if (name !== '#text' && name[0] === '#') {
			switch (name) {
				case '#transparent': {
					tagList.add(___TRANSPARENT___);
					break;
				}
				default: {
					const tags = unfoldContentModelsToTags(name);
					tags.forEach(tag => tagList.add(`<${espace(tag)}>`));
				}
			}
			continue;
		}
		tagList.add(`<${espace(name)}>`);
	}

	return tagList;
}

function targetTags(target: Target, ignore: Target | null, min: number, max: number) {
	const tagList = resolveTags(target);
	const ignoreList = ignore ? resolveTags(ignore) : null;

	if (ignoreList) {
		ignoreList.forEach(ignore => tagList.delete(ignore));
	}

	return join(Array.from(tagList), createRange(min, max));
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

function espace(selector: string) {
	return selector.replace(/\[/g, '【').replace(/\]/g, '】');
}
