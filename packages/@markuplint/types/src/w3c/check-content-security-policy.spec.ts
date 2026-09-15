import { describe, expect, test } from 'vitest';

import { checkContentSecurityPolicy } from './check-content-security-policy.js';

const check = checkContentSecurityPolicy();

describe('valid per CSP3 §4 "Framework" serialized-policy grammar', () => {
	test('empty policy: ""', () => {
		expect(check('').matched).toBe(true);
	});

	test('single keyword-source: "default-src \'self\'"', () => {
		expect(check("default-src 'self'").matched).toBe(true);
	});

	test("multiple directives: \"default-src 'none'; script-src 'self' 'unsafe-inline'\"", () => {
		expect(check("default-src 'none'; script-src 'self' 'unsafe-inline'").matched).toBe(true);
	});

	test("scheme-source and keyword-source mixed: \"default-src https: data: 'unsafe-inline' 'unsafe-eval'\"", () => {
		expect(check("default-src https: data: 'unsafe-inline' 'unsafe-eval'").matched).toBe(true);
	});

	test('wildcard and host-source: "img-src *; media-src media1.com media2.com; script-src userscripts.example.com"', () => {
		expect(check('img-src *; media-src media1.com media2.com; script-src userscripts.example.com').matched).toBe(
			true,
		);
	});

	test('sandbox with no tokens: "sandbox"', () => {
		expect(check('sandbox').matched).toBe(true);
	});

	test('sandbox with tokens: "sandbox allow-forms allow-popups allow-scripts"', () => {
		expect(check('sandbox allow-forms allow-popups allow-scripts').matched).toBe(true);
	});

	test('require-trusted-types-for: "require-trusted-types-for \'script\'"', () => {
		expect(check("require-trusted-types-for 'script'").matched).toBe(true);
	});

	test('trusted-types with policy name only: "trusted-types myPolicy"', () => {
		expect(check('trusted-types myPolicy').matched).toBe(true);
	});

	test('trusted-types with allow-duplicates: "trusted-types myPolicy \'allow-duplicates\'"', () => {
		expect(check("trusted-types myPolicy 'allow-duplicates'").matched).toBe(true);
	});

	test('nonce-source: "script-src \'nonce-rAnd0m123\'"', () => {
		expect(check("script-src 'nonce-rAnd0m123'").matched).toBe(true);
	});

	test('hash-source (sha256/384/512): three directives', () => {
		expect(check("script-src 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='").matched).toBe(true);
		expect(
			check("script-src 'sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb'").matched,
		).toBe(true);
		expect(
			check(
				"script-src 'sha512-z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg=='",
			).matched,
		).toBe(true);
	});

	test('bare boolean directive: "upgrade-insecure-requests"', () => {
		expect(check('upgrade-insecure-requests').matched).toBe(true);
	});

	test('a fetch directive with no value at all: "default-src"', () => {
		expect(check('default-src').matched).toBe(true);
	});

	test('trusted-types wildcard: "trusted-types *"', () => {
		expect(check('trusted-types *').matched).toBe(true);
	});

	test('bare trusted-types with no policy list: "trusted-types"', () => {
		expect(check('trusted-types').matched).toBe(true);
	});

	test('report-uri accepts any value (grammar not further validated)', () => {
		expect(check('report-uri /csp-report-endpoint').matched).toBe(true);
	});

	test('report-to accepts any value (grammar not further validated)', () => {
		expect(check('report-to csp-endpoint-name').matched).toBe(true);
	});

	test('webrtc accepts any value (grammar not further validated)', () => {
		expect(check("webrtc 'allow'").matched).toBe(true);
	});

	test("comma-separated policy list: \"default-src 'self', script-src 'unsafe-inline'\"", () => {
		expect(check("default-src 'self', script-src 'unsafe-inline'").matched).toBe(true);
	});

	test('comma-separated policy list with repeated directive across policies', () => {
		expect(check("default-src 'none', default-src 'self', script-src 'unsafe-inline'").matched).toBe(true);
	});

	test('a realistic multi-directive policy', () => {
		expect(
			check(
				"default-src 'none'; base-uri 'none'; frame-ancestors 'self'; script-src 'strict-dynamic' 'nonce-VVz1fXT3a0vl40s51oUfepWP2SS22WWFPA+HKdp5dUE=' https: 'unsafe-inline'; style-src 'self' 'nonce-VVz1fXT3a0vl40s51oUfepWP2SS22WWFPA+HKdp5dUE='; img-src 'self'; object-src 'none'; connect-src 'self'; frame-src 'none'; manifest-src 'self'; form-action 'self'; font-src 'self'; require-trusted-types-for 'script'; upgrade-insecure-requests",
			).matched,
		).toBe(true);
	});
});

describe('invalid per CSP3 §4 "Framework" serialized-policy grammar', () => {
	test('unrecognized directive name: nu-validator fixture csp-invalid-directive-haswarn.html', () => {
		// nu message: 'Unrecognized directive invalid-directive'
		const result = check("default-src 'self'; invalid-directive 'none'");
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('doesnt-exist-in-enum');
	});

	test('unrecognized source-expression: nu-validator fixture csp-invalid-source-novalid.html', () => {
		// nu message: "Unrecognized source-expression 'invalid-keyword'"
		const result = check("default-src 'invalid-keyword'");
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('unexpected-token');
	});

	test('non-ASCII authority: nu-validator fixture csp-non-ascii-novalid.html', () => {
		// nu message: 'Content Security Policy must contain only ASCII characters.'
		const result = check("default-src 'self'; img-src https://例え.com");
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('syntax-error');
	});

	test('"\'none\'" combined with another source-expression is illegal', () => {
		const result = check("default-src 'none' 'self'");
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('illegal-combination');
	});

	test('sandbox with an unrecognized token', () => {
		const result = check('sandbox allow-nothing-such');
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('doesnt-exist-in-enum');
	});

	test('require-trusted-types-for with a non-"script" keyword', () => {
		const result = check("require-trusted-types-for 'style'");
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('doesnt-exist-in-enum');
	});

	test('require-trusted-types-for with no value', () => {
		const result = check('require-trusted-types-for');
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('missing-token');
	});

	test('upgrade-insecure-requests must not carry a value', () => {
		const result = check('upgrade-insecure-requests always');
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('extra-token');
	});

	test('a directive-name outside the ALPHA/DIGIT/"-" charset', () => {
		const result = check("default_src 'self'");
		expect(result.matched).toBe(false);
		expect(result.matched || result.reason).toBe('unexpected-token');
	});
});
