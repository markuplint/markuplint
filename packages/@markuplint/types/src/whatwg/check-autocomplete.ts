import type { CustomSyntaxChecker, Expect } from '../types.js';

import { log } from '../debug.js';
import { getCandidate } from '../get-candidate.js';
import { matched } from '../match-result.js';
import { TokenCollection } from '../token/index.js';

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
const webauthnFieldNames = new Set(['webauthn']);

const URL_AUTOCOMPLETE = 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete';
const URL_ON_OFF =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2';
const URL_NAMED_GROUP =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section';
const URL_PART_OF_ADDRESS =
	'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping';
const URL_AUTOFILL_FIELD = 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field';

type FieldCategory = 'Normal' | 'Contact' | 'Credential';

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field
 */
function determineFieldCategory(value: string): { category: FieldCategory } | null {
	const lower = value.toLowerCase();
	if (autofillFieldNames.includes(lower)) {
		return { category: 'Normal' };
	}
	if (contactableFieldNames.includes(lower)) {
		return { category: 'Contact' };
	}
	if (webauthnFieldNames.has(lower)) {
		return { category: 'Credential' };
	}
	return null;
}

/**
 * Element/state-specific tightening applied on top of the shared
 * autocomplete grammar.
 *
 * - `noWebauthn`: reject the `webauthn` token. Applies to elements
 *   where webauthn is not valid per HTML LS
 *   §attr-fe-autocomplete-webauthn ("webauthn is only valid for input
 *   and textarea elements"). Wired for `<select>`.
 * - `anchorMantle`: reject the `on` / `off` keywords per HTML LS
 *   §autofill-anchor-mantle: "When wearing the autofill anchor
 *   mantle, the autocomplete attribute [...] must have a value that is
 *   an ordered set of space-separated tokens consisting of just
 *   autofill detail tokens (i.e. the 'on' and 'off' keywords are not
 *   allowed)." The anchor mantle applies to `<input type=hidden>`
 *   only; every other autocomplete-carrying control wears the
 *   expectation mantle where on/off are valid.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle
 */
export type CheckAutoCompleteOptions = {
	readonly noWebauthn?: boolean;
	readonly anchorMantle?: boolean;
};

/**
 * Parses backward (right-to-left) to match the spec algorithm, which is
 * anchored on the trailing field name.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete
 */
export const checkAutoComplete: CustomSyntaxChecker<CheckAutoCompleteOptions> =
	(options = {}) =>
	value => {
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
			ref: URL_AUTOCOMPLETE,
		});
		if (!listingChecked.matched) {
			acLog('Unmatch: %s', listingChecked.reason);
			return listingChecked;
		}

		const identTokens = tokens.getIdentTokens();
		if (identTokens.length === 0) {
			// Never — TokenCollection.check would catch empty
			throw new Error('TokenCollection is empty');
		}

		// Anchor-mantle gate: HTML LS §autofill-anchor-mantle forbids the
		// on/off keywords anywhere in the value ("consisting of just
		// autofill detail tokens"). Scan every token so the diagnostic
		// cites the anchor-mantle spec even when on/off is not the first
		// token (e.g. `name on`, `off name`); the "unknown field name"
		// fallback further down would otherwise mask the true reason.
		if (options.anchorMantle) {
			const onOffToken = identTokens.find(t => t.matches(['on', 'off'], true));
			if (onOffToken) {
				acLog('[Unmatched ("%s")] on/off keyword rejected in autofill anchor mantle', value);
				return onOffToken.unmatched({
					reason: 'unexpected-token',
					expects: [{ type: 'common', value: 'autofill field name' }],
					ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle',
				});
			}
		}

		const firstToken = identTokens[0]!;

		// Check for "on" / "off"
		if (firstToken.matches(['on', 'off'], true)) {
			if (identTokens[1]) {
				acLog('[Unmatched ("%s")] Unexpected pair with "on" or "off": "%s"', value, identTokens[1].value);
				return identTokens[1].unmatched({
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

		// Check for "on" / "off" appearing as the last token in a multi-token context
		const lastIdentToken = identTokens.at(-1)!;
		if (lastIdentToken.matches(['on', 'off'], true) && identTokens.length > 1) {
			acLog('[Unmatched ("%s")] Extra token "on"/"off" at end: "%s"', value, lastIdentToken.value);
			return lastIdentToken.unmatched({
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

		// --- Backward parsing ---
		let index = identTokens.length - 1;

		// Step 1: Determine field category from last token
		const lastToken = identTokens[index]!;
		const fieldResult = determineFieldCategory(lastToken.value);

		if (!fieldResult) {
			// Last token is not a valid field name
			const allFieldNames = [...autofillFieldNames, ...contactableFieldNames];
			const expects: Expect[] = [
				{
					type: 'common',
					value: 'autofill field name',
				},
			];

			// If single token, also suggest named group
			if (identTokens.length === 1) {
				expects.unshift({
					type: 'common',
					value: 'autofill named group',
				});
			}

			let candidate = getCandidate(lastToken.value, allFieldNames);

			// If single token, also check for section- typo
			if (!candidate && identTokens.length === 1) {
				const [prefix, namedGroupStr] = lastToken.value.split('-');
				const candidatePrefix = getCandidate(prefix, 'section');
				if (candidatePrefix) {
					candidate = `${candidatePrefix}-${namedGroupStr ?? ''}`;
				}
			}

			acLog('[Unmatched ("%s")] Unexpected token: "%s"', value, lastToken.value);
			return lastToken.unmatched({
				reason: 'unexpected-token',
				expects,
				candidate,
				ref: URL_AUTOFILL_FIELD,
			});
		}

		let { category } = fieldResult;
		index--;

		// Step 2: Handle webauthn (Credential category re-determination)
		if (category === 'Credential') {
			// Per HTML LS §attr-fe-autocomplete-webauthn, webauthn "is only valid
			// for input and textarea elements." Elements that pass `noWebauthn`
			// (button / fieldset / object / output / select) reject the token
			// with a spec-cited unexpected-token result so the diagnostic
			// distinguishes it from a generic unknown field name.
			if (options.noWebauthn) {
				acLog('[Unmatched ("%s")] webauthn is not valid on this element', value);
				return lastToken.unmatched({
					reason: 'unexpected-token',
					expects: [{ type: 'common', value: 'autofill field name' }],
					ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn',
				});
			}
			// webauthn token consumed; if there are more tokens, re-determine category
			if (index >= 0) {
				const preWebauthnToken = identTokens[index]!;
				const reResult = determineFieldCategory(preWebauthnToken.value);

				if (reResult && reResult.category !== 'Credential') {
					// Re-determine: the token before webauthn is the actual field name
					category = reResult.category;
					index--;
				} else if (reResult && reResult.category === 'Credential') {
					// webauthn webauthn — duplicate caught by TokenCollection.check unique
					acLog('[Unmatched ("%s")] Duplicate webauthn', value);
					return preWebauthnToken.unmatched({
						reason: 'extra-token',
						expects: [{ type: 'format', value: 'autocomplete' }],
						ref: URL_AUTOFILL_FIELD,
					});
				} else {
					// Token before webauthn is not a valid field name
					const allFieldNames = [...autofillFieldNames, ...contactableFieldNames];
					const candidate = getCandidate(preWebauthnToken.value, allFieldNames);
					acLog('[Unmatched ("%s")] Unexpected token before webauthn: "%s"', value, preWebauthnToken.value);
					return preWebauthnToken.unmatched({
						reason: 'unexpected-token',
						expects: [{ type: 'common', value: 'autofill field name' }],
						candidate,
						ref: URL_AUTOFILL_FIELD,
					});
				}
			} else {
				// Spec: "The webauthn token must not be the only token in the
				// autocomplete attribute's value."
				// https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn
				acLog('[Unmatched ("%s")] Standalone webauthn rejected', value);
				return lastToken.unmatched({
					reason: 'unexpected-token',
					expects: [{ type: 'common', value: 'autofill field name' }],
					ref: URL_AUTOFILL_FIELD,
				});
			}
		}

		// No more tokens to validate — only the field name was present
		if (index < 0) {
			return matched();
		}

		// Track which optional prefixes have been consumed
		let hasPartOfAddress = false;
		let hasNamedGroup = false;

		// Step 3: If Contact category, optionally consume contacting token
		if (category === 'Contact') {
			const currentToken = identTokens[index]!;
			if (currentToken.matches(contactingTokens, true)) {
				index--;
				if (index < 0) {
					return matched();
				}
			}
		}

		// Step 4: If Normal category, the current token must NOT be a contacting token
		// (contacting tokens are only valid before contactable field names)
		if (category === 'Normal') {
			const currentToken = identTokens[index]!;
			if (currentToken.matches(contactingTokens, true)) {
				acLog('[Unmatched ("%s")] Contacting token not valid for Normal field', value, currentToken.value);
				return currentToken.unmatched({
					reason: 'unexpected-token',
					expects: [
						...partOfAddress.map(token => ({
							type: 'const' as const,
							value: token,
						})),
						{
							type: 'common' as const,
							value: 'autofill named group',
						},
					],
					ref: URL_PART_OF_ADDRESS,
				});
			}
		}

		// Step 5: Optionally consume shipping/billing
		if (index >= 0) {
			const currentToken = identTokens[index]!;
			if (currentToken.matches(partOfAddress, true)) {
				hasPartOfAddress = true;
				index--;
				if (index < 0) {
					return matched();
				}
			}
		}

		// Step 6: Optionally consume section-*
		if (index >= 0) {
			const currentToken = identTokens[index]!;
			if (currentToken.matches(namedGroup, true)) {
				hasNamedGroup = true;
				index--;
				if (index < 0) {
					return matched();
				}
			}
		}

		// Step 7: If there are remaining tokens, they are extra
		if (index >= 0) {
			const extraToken = identTokens[index]!;

			// Build expects based on what hasn't been consumed yet
			const extraExpects: Expect[] = [];
			if (!hasPartOfAddress && !hasNamedGroup) {
				// Neither shipping/billing nor section-* consumed — could be either
				extraExpects.push(
					...partOfAddress.map(token => ({
						type: 'const' as const,
						value: token,
					})),
					{
						type: 'common',
						value: 'autofill field name',
					},
				);
			} else if (hasNamedGroup) {
				// Both consumed — nothing expected, pure extra
				extraExpects.push({
					type: 'common',
					value: 'autofill named group',
				});
			} else {
				// shipping/billing consumed but section-* not — expect section-*
				extraExpects.push({
					type: 'common',
					value: 'autofill named group',
				});
			}

			// Check if it's a section-* typo
			let candidate: string | undefined;
			const [prefix, namedGroupStr] = extraToken.value.split('-');
			const candidatePrefix = getCandidate(prefix, 'section');
			if (candidatePrefix) {
				candidate = `${candidatePrefix}-${namedGroupStr ?? ''}`;
			}

			if (!candidate) {
				candidate = getCandidate(extraToken.value, partOfAddress, autofillFieldNames, contactableFieldNames);
			}

			const ref = !hasPartOfAddress && !hasNamedGroup ? URL_AUTOFILL_FIELD : URL_NAMED_GROUP;

			acLog('[Unmatched ("%s")] Extra token: "%s"', value, extraToken.value);
			return extraToken.unmatched({
				reason: 'unexpected-token',
				expects: extraExpects,
				candidate,
				ref,
			});
		}

		return matched();
	};
