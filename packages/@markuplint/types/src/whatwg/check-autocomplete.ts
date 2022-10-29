import type { Expect } from '..';
import type { CustomSyntaxChecker } from '../types';

import { log } from '../debug';
import { getCandicate } from '../get-candicate';
import { matched } from '../match-result';
import { TokenCollection } from '../token';

const acLog = log.extend('autocomplete');

/**
 * https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section
 */
const namedGroup = /^section-/i;

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping
 */
const partOfAddress = ['shipping', 'billing'];

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field
 */
const autofillFieldNames = [
	'name',
	'honorific-prefix',
	'given-name',
	'additional-name',
	'family-name',
	'honorific-suffix',
	'nickname',
	'username',
	'new-password',
	'current-password',
	'one-time-code',
	'organization-title',
	'organization',
	'street-address',
	'address-line1',
	'address-line2',
	'address-line3',
	'address-level4',
	'address-level3',
	'address-level2',
	'address-level1',
	'country',
	'country-name',
	'postal-code',
	'cc-name',
	'cc-given-name',
	'cc-additional-name',
	'cc-family-name',
	'cc-number',
	'cc-exp',
	'cc-exp-month',
	'cc-exp-year',
	'cc-csc',
	'cc-type',
	'transaction-currency',
	'transaction-amount',
	'language',
	'bday',
	'bday-day',
	'bday-month',
	'bday-year',
	'sex',
	'url',
	'photo',
];

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-home
 */
const contactingTokens = ['home', 'work', 'mobile', 'fax', 'pager'];

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:ascii-case-insensitive-7
 */
const contactableFieldNames = [
	'tel',
	'tel-country-code',
	'tel-national',
	'tel-area-code',
	'tel-local',
	'tel-local-prefix',
	'tel-local-suffix',
	'tel-extension',
	'email',
	'impp',
];

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn
 */
const webauthnFieldNames = ['webauthn'];

const URL_AUTOCOMPLET = 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete';
const URL_ON_OFF =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2';
const URL_NAMED_GROUP =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section';
const URL_PART_OF_ADDRESS =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping';
const URL_AUTOFILL_FIELD = 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field';
const URL_CONTACTABLE_FIELD =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-tel';

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete
 */
export const checkAutoComplete: CustomSyntaxChecker = () => value => {
	let hasNamedGroup = false;
	let hasPartOfAddress = false;
	let hasContactingToken = false;

	const tokens = new TokenCollection(value, {
		disallowToSurroundBySpaces: false,
		allowEmpty: false,
		ordered: true,
		unique: true,
		caseInsensitive: true,
	});

	const listingChecked = tokens.check({
		expects: [
			{
				type: 'format',
				value: 'autocomplete',
			},
		],
		ref: URL_AUTOCOMPLET,
	});
	if (!listingChecked.matched) {
		acLog('Unmatch: %s', listingChecked.reason);
		return listingChecked;
	}

	const idents = tokens.getIdentTokens();
	const headAndTail1 = idents.headAndTail();
	let { head, tail } = headAndTail1;
	if (!head) {
		// Never
		throw new Error('TokenCollection is empty');
	}

	// > When wearing the autofill anchor mantle, the autocomplete attribute,
	// > if specified, must have a value that is
	// > an ordered set of space-separated tokens consisting of
	// > just autofill detail tokens
	// > (i.e. the "on" and "off" keywords are not allowed).
	if (head.match(['on', 'off'], true)) {
		if (tail.length) {
			acLog('[Unmatched ("%s")] Unexpected pair with "on" or "off": "%s"', value, tail.value);
			return tail[0].unmatched({
				reason: 'extra-token',
				expects: [
					{
						type: 'format',
						value: 'autocomplete',
					},
				],
				ref: URL_ON_OFF,
			});
		}

		return matched();
	}

	// > Optionally, a token whose first eight characters are
	// > an ASCII case-insensitive match for the string "section-",
	// > meaning that the field belongs to the named group.
	if (head.match(namedGroup, true)) {
		hasNamedGroup = true;
		const sectionToken = tail.search(namedGroup);
		if (sectionToken) {
			acLog('[Unmatched ("%s")] Deprecated in autofill named group: "%s"', value, sectionToken.value);
			return sectionToken.unmatched({
				partName: 'autofill named group',
				reason: 'duplicated',
				ref: URL_NAMED_GROUP,
			});
		}

		const headAndTail2 = tail.headAndTail();
		head = headAndTail2.head;
		tail = headAndTail2.tail;

		if (!head) {
			// Missing autofill field name but it is valid
			return matched();
		}
	}

	// > Optionally, a token that is an ASCII case-insensitive match for
	// > one of the following strings:
	// > - "shipping", meaning the field is part of the shipping address or contact information
	// > - "billing", meaning the field is part of the billing address or contact information
	if (head.match(partOfAddress, true)) {
		hasPartOfAddress = true;
		const partToken = tail.search(partOfAddress);
		if (partToken) {
			acLog('[Unmatched ("%s")] Duplicated values: "%s"', value, partToken.value);
			return partToken.unmatched({
				reason: 'duplicated',
				expects: [
					{
						type: 'format',
						value: 'autocomplete',
					},
				],
				ref: URL_PART_OF_ADDRESS,
			});
		}

		const headAndTail3 = tail.headAndTail();
		head = headAndTail3.head;
		tail = headAndTail3.tail;

		if (!head) {
			// Missing autofill field name but it is valid
			return matched();
		}
	}

	if (head.match(contactingTokens, true)) {
		hasContactingToken = true;
		const contactableFiledToken = tail[0];
		if (!contactableFiledToken) {
			// Missing autofill field name but it is valid
			return matched();
		}

		if (!contactableFiledToken.match(contactableFieldNames, true)) {
			const candicate = getCandicate(contactableFiledToken.value, contactableFieldNames);
			acLog('[Unmatched ("%s")] Unexpected token: "%s"', value, contactableFiledToken.value);
			return contactableFiledToken.unmatched({
				reason: 'unexpected-token',
				expects: contactableFieldNames.slice().map(token => ({
					type: 'const' as const,
					value: token,
				})),
				candicate,
				ref: URL_CONTACTABLE_FIELD,
			});
		}

		if (tail[1]) {
			if (tail[1].match(webauthnFieldNames)) {
				return matched();
			}

			const candicate = getCandicate(tail[1].value, webauthnFieldNames);

			if (candicate) {
				acLog(
					'[Unmatched ("%s")] Unnecessarily token: "%s", Do you mean "%s"? ',
					value,
					tail[1].value,
					candicate,
				);
			} else {
				acLog('[Unmatched ("%s")] Unnecessarily token: "%s"', value, tail[1].value);
			}

			return tail[1].unmatched({
				reason: 'extra-token',
				expects: [
					{
						type: 'format',
						value: 'autocomplete',
					},
				],
				ref: URL_AUTOFILL_FIELD,
			});
		}

		return matched();
	}

	if (head.match([...autofillFieldNames, ...contactableFieldNames], true)) {
		if (tail.length) {
			if (tail[0].match(webauthnFieldNames)) {
				return matched();
			}

			const candicate = getCandicate(tail[0].value, webauthnFieldNames);

			if (candicate) {
				acLog(
					'[Unmatched ("%s")] Unnecessarily token: "%s", Do you mean "%s"? ',
					value,
					tail[0].value,
					candicate,
				);
			} else {
				acLog('[Unmatched ("%s")] Unnecessarily token: "%s"', value, tail[0].value);
			}

			return tail[0].unmatched({
				reason: 'extra-token',
				expects: [
					{
						type: 'format',
						value: 'autocomplete',
					},
				],
				ref: URL_AUTOFILL_FIELD,
			});
		}

		return matched();
	}

	if (head.match(webauthnFieldNames)) {
		return matched();
	}

	const expects: Expect[] = [
		{
			type: 'common',
			value: 'autofill field name',
		},
	];
	let candicate: string | undefined;

	if (!hasNamedGroup) {
		expects.unshift({
			type: 'common',
			value: 'autofill named group',
		});

		// Potentially typo a named group
		const [prefix, namedGroupStr] = head.value.split('-');
		const candicatePrefix = getCandicate(prefix, 'section');
		if (candicatePrefix) {
			candicate = `${candicatePrefix}-${namedGroupStr || ''}`;
		}
	} else if (!hasPartOfAddress) {
		expects.unshift(
			...partOfAddress
				.slice()
				.reverse()
				.map(token => ({
					type: 'const' as const,
					value: token,
				})),
		);

		candicate = getCandicate(
			head.value,
			partOfAddress,
			autofillFieldNames,
			contactingTokens,
			contactableFieldNames,
		);
	} else if (!hasContactingToken) {
		expects.push(
			...contactingTokens.slice().map(token => ({
				type: 'const' as const,
				value: token,
			})),
		);

		candicate = getCandicate(head.value, autofillFieldNames, contactingTokens, contactableFieldNames);
	}

	candicate = candicate || getCandicate(head.value, autofillFieldNames);

	if (candicate) {
		acLog('[Unmatched ("%s")] Unexpected token: "%s", Do you mean "%s"? ', value, head.value, candicate);
	} else {
		acLog('[Unmatched ("%s")] Unexpected token: "%s"', value, head.value);
	}
	return head.unmatched({
		reason: 'unexpected-token',
		expects,
		candicate,
		ref: URL_AUTOFILL_FIELD,
	});
};
