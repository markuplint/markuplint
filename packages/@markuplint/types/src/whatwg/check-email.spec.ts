import { test, expect, describe } from 'vitest';

import { check } from '../check.js';

describe('Email', () => {
	test('valid: simple address', () => {
		expect(check('user@example.com', 'Email').matched).toBe(true);
	});

	test('valid: subdomain', () => {
		expect(check('user@mail.example.com', 'Email').matched).toBe(true);
	});

	test('valid: with plus', () => {
		expect(check('user+tag@example.com', 'Email').matched).toBe(true);
	});

	test('valid: with dots in local part', () => {
		expect(check('first.last@example.com', 'Email').matched).toBe(true);
	});

	test('valid: single char local part', () => {
		expect(check('a@example.com', 'Email').matched).toBe(true);
	});

	test('valid: numeric domain', () => {
		expect(check('user@123.123.123.com', 'Email').matched).toBe(true);
	});

	test('valid: hyphen in domain', () => {
		expect(check('user@my-domain.com', 'Email').matched).toBe(true);
	});

	test('valid: special chars in local part', () => {
		expect(check("!#$%&'*+/=?^_`{|}~@example.com", 'Email').matched).toBe(true);
	});

	test('invalid: missing @', () => {
		expect(check('userexample.com', 'Email').matched).toBe(false);
	});

	test('invalid: missing local part', () => {
		expect(check('@example.com', 'Email').matched).toBe(false);
	});

	test('invalid: missing domain', () => {
		expect(check('user@', 'Email').matched).toBe(false);
	});

	test('invalid: empty string', () => {
		expect(check('', 'Email').matched).toBe(false);
	});

	test('invalid: spaces', () => {
		expect(check('user @example.com', 'Email').matched).toBe(false);
	});

	test('invalid: double @', () => {
		expect(check('user@@example.com', 'Email').matched).toBe(false);
	});

	test('invalid: domain starts with hyphen', () => {
		expect(check('user@-example.com', 'Email').matched).toBe(false);
	});

	test('invalid: domain ends with hyphen', () => {
		expect(check('user@example-.com', 'Email').matched).toBe(false);
	});

	test('invalid: Unicode local part (spec requires ASCII only)', () => {
		expect(check('\u30E6\u30FC\u30B6\u30FC@example.com', 'Email').matched).toBe(false);
	});

	test('invalid: Unicode domain', () => {
		expect(check('user@\u4F8B.jp', 'Email').matched).toBe(false);
	});
});
