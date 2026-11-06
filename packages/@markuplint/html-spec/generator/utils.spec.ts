import { describe, test, expect } from 'vitest';

import { getName, inheritDeprecatedProperties, isDeprecatedOwnedProperty, isDeprecatedRole } from './utils.ts';

describe('inheritDeprecatedProperties', () => {
	const ariaRoles = [
		{
			name: 'link',
			ownedProperties: [
				{ name: 'aria-disabled' },
				{ name: 'aria-errormessage', deprecated: true as const, inherited: true as const },
			],
		},
		{
			name: 'section',
			ownedProperties: [{ name: 'aria-disabled', deprecated: true as const, inherited: true as const }],
		},
	];

	test('takes the flag from the superclass, ignoring a flag already on the entry', () => {
		const [noteref] = inheritDeprecatedProperties(
			[
				{
					name: 'doc-noteref',
					generalization: ['link'],
					ownedProperties: [
						{ name: 'aria-disabled', deprecated: true, inherited: true },
						{ name: 'aria-errormessage', inherited: true },
					],
				},
			],
			ariaRoles,
		);
		expect(noteref?.ownedProperties).toStrictEqual([
			{ name: 'aria-disabled', deprecated: undefined, inherited: true },
			{ name: 'aria-errormessage', deprecated: true, inherited: true },
		]);
	});

	test('marks a property deprecated on a section subclass as section does', () => {
		const [abstract] = inheritDeprecatedProperties(
			[
				{
					name: 'doc-abstract',
					generalization: ['section'],
					ownedProperties: [{ name: 'aria-disabled', inherited: true }],
				},
			],
			ariaRoles,
		);
		expect(abstract?.ownedProperties).toStrictEqual([{ name: 'aria-disabled', deprecated: true, inherited: true }]);
	});

	test('leaves a property unflagged when no superclass owns it or the superclass is unknown', () => {
		const [role] = inheritDeprecatedProperties(
			[
				{
					name: 'doc-x',
					generalization: ['unknown-role'],
					ownedProperties: [{ name: 'aria-disabled', inherited: true }],
				},
			],
			ariaRoles,
		);
		expect(role?.ownedProperties).toStrictEqual([
			{ name: 'aria-disabled', deprecated: undefined, inherited: true },
		]);
	});

	test('keeps the role-level fields as they are', () => {
		const [role] = inheritDeprecatedProperties(
			[
				{
					name: 'doc-endnote',
					description: 'd',
					deprecated: true,
					generalization: ['link'],
					ownedProperties: [],
				},
			],
			ariaRoles,
		);
		expect(role).toStrictEqual({
			name: 'doc-endnote',
			description: 'd',
			deprecated: true,
			generalization: ['link'],
			ownedProperties: [],
		});
	});
});

describe('isDeprecatedRole', () => {
	const directoryBody =
		"A list of references to members of a group, such as a static table of contents.\n\nAs exposed by accessibility APIs, the directory role is essentially equivalent to the list role. So, using directory does not provide any additional benefits to assistive technology users. Authors are advised to treat directory as deprecated and to use list, or a host language's equivalent semantics instead.";

	test('detects the WAI-ARIA 1.2 marker "[Deprecated in ARIA x.y]" in a multi-paragraph description', () => {
		expect(isDeprecatedRole(`[Deprecated in ARIA 1.2] ${directoryBody}`)).toBe(true);
	});

	test('detects the WAI-ARIA 1.3 marker "[Deprecated since ARIA x.y]" in a multi-paragraph description', () => {
		expect(isDeprecatedRole(`[Deprecated since ARIA 1.2] ${directoryBody}`)).toBe(true);
	});

	test('detects the DPUB-ARIA marker "[Deprecated in DPUB-ARIA x.y]"', () => {
		expect(isDeprecatedRole('[Deprecated in DPUB-ARIA 1.1] A single reference to an external source.')).toBe(true);
	});

	test('detects the marker with another "<prefix>-ARIA" name', () => {
		expect(isDeprecatedRole('[Deprecated in Graphics-ARIA 1.0] A graphic.')).toBe(true);
		expect(isDeprecatedRole('[Deprecated in WAI-ARIA 1.1] A list.')).toBe(true);
	});

	test('detects the marker opening a later paragraph', () => {
		expect(isDeprecatedRole(`A note on this role.\n\n[Deprecated in ARIA 1.2] ${directoryBody}`)).toBe(true);
	});

	test('detects the marker regardless of case', () => {
		expect(isDeprecatedRole('[deprecated SINCE aria 1.2] A list.')).toBe(true);
	});

	test('detects multi-digit version numbers', () => {
		expect(isDeprecatedRole('[Deprecated in ARIA 1.10] A list.')).toBe(true);
		expect(isDeprecatedRole('[Deprecated in ARIA 2.0] A list.')).toBe(true);
	});

	test('does not treat a description without the marker as deprecated', () => {
		expect(isDeprecatedRole('A section containing listitem elements.')).toBe(false);
		expect(isDeprecatedRole('')).toBe(false);
	});

	test('does not treat the word "deprecated" in prose as the marker', () => {
		expect(isDeprecatedRole(directoryBody)).toBe(false);
	});

	test('does not treat the marker text without brackets as the marker', () => {
		expect(isDeprecatedRole('Deprecated in ARIA 1.2. A list.')).toBe(false);
	});

	test("does not treat a marker inside a sentence as the role's own", () => {
		expect(isDeprecatedRole('A list.\n\nThe directory role [Deprecated in ARIA 1.2] is replaced by list.')).toBe(
			false,
		);
	});
});

describe('isDeprecatedOwnedProperty', () => {
	test('detects "(deprecated on this role in ARIA x.y)"', () => {
		expect(isDeprecatedOwnedProperty('aria-errormessage (deprecated on this role in ARIA 1.2)')).toBe(true);
		expect(isDeprecatedOwnedProperty('aria-invalid (state) (deprecated on this role in ARIA 1.2)')).toBe(true);
	});

	test('detects "(Global use deprecated in ARIA x.y)"', () => {
		expect(isDeprecatedOwnedProperty('aria-disabled (state) (Global use deprecated in ARIA 1.2)')).toBe(true);
	});

	test('detects the "since" wording', () => {
		expect(isDeprecatedOwnedProperty('aria-haspopup (deprecated on this role since ARIA 1.2)')).toBe(true);
	});

	test('detects a note that continues after the version', () => {
		expect(isDeprecatedOwnedProperty('aria-haspopup (deprecated on this role in ARIA 1.2; use aria-x)')).toBe(true);
	});

	test('does not treat a plain entry as deprecated', () => {
		expect(isDeprecatedOwnedProperty('aria-invalid (state)')).toBe(false);
		expect(isDeprecatedOwnedProperty('aria-label')).toBe(false);
	});

	test('does not treat a note without an ARIA version as a deprecation note', () => {
		expect(isDeprecatedOwnedProperty('aria-grabbed (state) (see the deprecated aria-dropeffect)')).toBe(false);
	});

	test('does not treat a negated note as a deprecation note', () => {
		expect(isDeprecatedOwnedProperty('aria-owns (not deprecated in ARIA 1.2)')).toBe(false);
	});
});

describe('getName', () => {
	test('HTML element', () => {
		expect(getName('div')).toStrictEqual({
			localName: 'div',
			namespace: undefined,
			ml: 'HTML',
		});
	});

	test('SVG element', () => {
		expect(getName('svg_circle')).toStrictEqual({
			localName: 'circle',
			namespace: 'http://www.w3.org/2000/svg',
			ml: 'SVG',
		});
	});

	test('MathML element', () => {
		expect(getName('mml_math')).toStrictEqual({
			localName: 'math',
			namespace: 'http://www.w3.org/1998/Math/MathML',
			ml: 'MathML',
		});
	});

	test('MathML element with hyphen', () => {
		expect(getName('mml_annotation-xml')).toStrictEqual({
			localName: 'annotation-xml',
			namespace: 'http://www.w3.org/1998/Math/MathML',
			ml: 'MathML',
		});
	});

	test('case insensitivity of prefix', () => {
		expect(getName('SVG_circle')).toStrictEqual({
			localName: 'circle',
			namespace: 'http://www.w3.org/2000/svg',
			ml: 'SVG',
		});
		expect(getName('MML_math')).toStrictEqual({
			localName: 'math',
			namespace: 'http://www.w3.org/1998/Math/MathML',
			ml: 'MathML',
		});
	});

	test('plain name without prefix', () => {
		expect(getName('custom-element')).toStrictEqual({
			localName: 'custom-element',
			namespace: undefined,
			ml: 'HTML',
		});
	});
});
