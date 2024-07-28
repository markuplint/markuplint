import type { Translator } from '@markuplint/i18n';
import type { AttributeType } from '@markuplint/ml-spec';
import type { UnmatchedResult, List, Number, Expect } from '@markuplint/types';
import type { ReadonlyDeep } from 'type-fest';

import { isList, isKeyword, isEnum, isNumber, isDirective } from '@markuplint/types';

export function createMessageValueExpected(
	t: Translator,
	baseTarget: string,
	type: ReadonlyDeep<AttributeType>,
	matches: UnmatchedResult,
) {
	let target = baseTarget;
	let listDescriptionPart: string | undefined;
	let tokenType: Exclude<ReadonlyDeep<AttributeType>, List>;

	if (isList(type)) {
		listDescriptionPart = t(
			'{0} expects {1:c}',
			target,
			type.separator === 'space' ? 'space-separated list' : 'comma-separated list',
		);

		tokenType = type.token;

		target = 'the content of the list';
	} else {
		tokenType = type;
	}

	const expected = createExpectedObject(tokenType, matches, t);

	const message = [listDescriptionPart, __createMessageValueExpected(t, target, expected, matches)]
		.filter(Boolean)
		.join(t('. '));

	return message;
}

export function __createMessageValueExpected(
	t: Translator,
	baseTarget: string,
	expected: string | null,
	matches: Pick<UnmatchedResult, 'partName' | 'reason' | 'raw' | 'candidate' | 'ref' | 'extra' | 'fallbackTo'>,
) {
	let target = baseTarget;
	let reasonPart: string | undefined;
	let expectPart: string | undefined;
	let unnecessaryPart: string | undefined;
	let candidatePart: string | undefined;
	let fallbackToPart: string | undefined;
	let expectOrNeed: 'expects' | 'needs' = 'expects';

	if (matches.partName) {
		if (matches.partName === 'the content of the list') {
			target = 'the content of the list';
		} else {
			target = t('{0} part of {1}', t('the {0}', matches.partName), target);
		}
	}

	switch (matches.reason) {
		case 'doesnt-exist-in-enum': {
			break;
		}
		case 'duplicated': {
			reasonPart = t('{0} is {1:c}', target, 'duplicated');
			target = 'it';
			break;
		}
		case 'empty-token': {
			reasonPart = t('{0} must not be {1}', target, 'empty');
			target = 'it';
			break;
		}
		case 'extra-token': {
			const token = matches.partName ?? 'token';
			reasonPart = t('Found {0}', t('extra {0}', token)) + ' ' + t([matches.raw]);
			if (matches.extra) {
				const extra = expectValueToWord(t, matches.extra, 'Any');
				unnecessaryPart = t("It doesn't need {0}", extra);
			}
			break;
		}
		case 'illegal-combination': {
			reasonPart = t('Found {0}', t('an {0}', 'illegal combination'));
			break;
		}
		case 'illegal-order': {
			break;
		}
		case 'missing-comma': {
			if (matches.partName) {
				reasonPart = t('Missing {0} in {1}', t('a {0}', 'comma'), t('the {0} part', matches.partName));
				target = 'it';
			} else {
				reasonPart = t('Missing {0}', t('a {0}', 'comma'));
			}
			break;
		}
		case 'missing-token': {
			if (matches.partName) {
				const part = t('the {0} part', matches.partName);
				reasonPart = t('Missing {0}', part);
				if (!expected) {
					expected = part;
					target = baseTarget;
				}
			} else {
				reasonPart = t('Missing {0}', t('a {0}', 'token'));
			}
			expectOrNeed = 'needs';
			break;
		}
		case 'must-be-percent-encoded': {
			break;
		}
		case 'must-be-serialized': {
			break;
		}
		case 'out-of-range': {
			break;
		}
		case 'syntax-error': {
			break;
		}
		case 'typo': {
			break;
		}
		case 'unexpected-comma': {
			reasonPart = t('Found {0}', t('unexpected {0}', 'comma'));
			break;
		}
		case 'unexpected-newline': {
			reasonPart = t('Found {0}', t('unexpected {0}', 'newline'));
			break;
		}
		case 'unexpected-space': {
			reasonPart = t('Found {0}', t('unexpected {0}', 'whitespace'));
			break;
		}
		case 'unexpected-token': {
			const chars = t('unexpected {0}', 'characters');
			if (matches.partName) {
				const part = t('the {0} part', matches.partName);
				reasonPart = t('{0} includes {1}', part, chars);
				target = 'it';
			} else {
				reasonPart = t('It includes {0}', chars);
			}
			break;
		}
		default: {
			if ('type' in matches.reason) {
				switch (matches.reason.type) {
					case 'out-of-range-length-digit': {
						const { gte, lte } = matches.reason;
						let expectedDigits: string | null = null;
						if (lte != null && gte === lte) {
							expectedDigits = t('{0} digits', gte);
						} else if (lte == null) {
							expectedDigits = t('{0} or more digits', gte);
						} else {
							expectedDigits = t('{0} to {1} digits', gte, lte);
						}
						if (!expected) {
							expected = expectedDigits;
						} else if (expected && expectedDigits) {
							expected = t('{0:c} and {1:c}', expectedDigits, expected);
						}
						break;
					}
					case 'out-of-range': {
						const expectedNum = createExpectedNumber(t, {
							...matches.reason,
							type: 'integer',
						});
						if (!expected) {
							expected = expectedNum;
						} else if (expected) {
							expected = t('{0:c} and {1:c}', expectedNum, expected);
						}
						break;
					}
				}
			}
		}
	}

	if (expected) {
		if (target === 'it') {
			if (expectOrNeed === 'expects') {
				expectPart = t('It expects {0:c}', expected);
			} else {
				expectPart = t('It needs {0}', expected);
			}
		} else {
			if (expectOrNeed === 'expects') {
				expectPart = t('{0} expects {1:c}', target, expected);
			} else {
				expectPart = t('{0} needs {1}', target, expected);
			}
		}
	}

	if (matches.candidate) {
		candidatePart = t('Did you mean "{0*}"?', matches.candidate);
	}

	if (matches.fallbackTo) {
		fallbackToPart = t('The user agent will automatically use "{0*}" instead', matches.fallbackTo);
	}

	let message = [reasonPart, unnecessaryPart, expectPart, candidatePart, fallbackToPart]
		.filter(Boolean)
		.join(t('. '));

	if (matches.ref) {
		message += ` (${matches.ref})`;
	}

	return message;
}

function createExpectedObject(
	type: ReadonlyDeep<Exclude<AttributeType, List>>,
	matches: UnmatchedResult,
	t: Translator,
): string | null {
	const expectedObject: string[] = [];

	if (matches.expects && matches.expects.length > 0) {
		expectedObject.push(
			...matches.expects.map(expect => {
				return expectValueToWord(t, expect, type);
			}),
		);
	} else if (isKeyword(type)) {
		if (type[0] === '<') {
			expectedObject.push(t('the CSS Syntax "{0}"', type));
		}
	} else if (isEnum(type)) {
		expectedObject.push(...type.enum);
	} else if (isNumber(type)) {
		expectedObject.push(createExpectedNumber(t, type));
	} else if (isDirective(type)) {
		expectedObject.push(t('a {0}', 'directive'));
	}

	const expects =
		expectedObject.length === 0
			? null
			: 1 < expectedObject.length
				? t('either {0}', t(expectedObject))
				: (expectedObject[0] ?? null);

	return expects;
}

function expectValueToWord(t: Translator, expect: Expect, type: ReadonlyDeep<Exclude<AttributeType, List>>) {
	switch (expect.type) {
		case 'common': {
			return expect.value;
		}
		case 'const': {
			return expect.value ? `%${expect.value}%` : '';
		}
		case 'format': {
			return t('the {0} format', expect.value);
		}
		case 'regexp': {
			return t('{0} ({1})', 'regular expression', expect.value);
		}
		case 'syntax': {
			if (isKeyword(type) && type[0] === '<') {
				return t('the CSS Syntax "{0}"', expect.value);
			}
			return t('{0} syntax', expect.value);
		}
	}
}

function createExpectedNumber(t: Translator, type: Readonly<Number>) {
	if (type.gt != null) {
		if (type.lt != null) {
			return t('{0} greater than {1} less than {2}', type.type, type.gt, type.lt);
		}
		if (type.lte != null) {
			return t('{0} greater than {1} less than or equal to {2}', type.type, type.gt, type.lte);
		}
		return t('{0} greater than {1}', type.type, type.gt);
	}
	if (type.gte != null) {
		if (type.lt != null) {
			return t('{0} greater than or equal to {1} less than {2}', type.type, type.gte, type.lt);
		}
		if (type.lte != null) {
			return t('{0} greater than or equal to {1} less than or equal to {2}', type.type, type.gte, type.lte);
		}
		return t('{0} greater than or equal to {1}', type.type, type.gte);
	}
	if (type.lt != null) {
		return t('{0} less than {1}', type.type, type.lt);
	}
	if (type.lte != null) {
		return t('{0} less than or equal to {1}', type.type, type.lte);
	}
	return type.type;
}
