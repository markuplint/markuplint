import type { PermittedContentChoice } from '@markuplint/ml-spec';

import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { choice } from './choice';

function c(models: PermittedContentChoice, innerHtml: string) {
	const el = createTestElement(`<div>${innerHtml}</div>`);
	return choice(models, Array.from(el.childNodes), specs, { ignoreHasMutableChildren: true }, 0);
}

it('ordered requires', () => {
	const models: PermittedContentChoice = {
		choice: [
			//
			[{ require: 'a' }],
			[{ require: 'b' }],
			[{ require: 'c' }],
		],
	};

	expect(c(models, '').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a>').type).toBe('MATCHED');
	expect(c(models, '<a></a><a></a>').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c(models, '<b></b>').type).toBe('MATCHED');
	expect(c(models, '<b></b><c></c>').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c(models, '<c></c>').type).toBe('MATCHED');
	expect(c(models, '<d></d>').type).toBe('MISSING_NODE_REQUIRED');
});

test('optional', () => {
	const models: PermittedContentChoice = {
		choice: [
			[
				{
					require: 'a',
				},
			],
			[
				{
					require: 'b',
				},
			],
			[
				{
					optional: 'c',
				},
			],
		],
	};

	expect(c(models, '').type).toBe('MATCHED_ZERO');
	expect(c(models, '<a></a>').type).toBe('MATCHED');
	expect(c(models, '<b></b>').type).toBe('MATCHED');
	expect(c(models, '<c></c>').type).toBe('MATCHED');
	expect(c(models, '<d></d>').type).toBe('UNEXPECTED_EXTRA_NODE');
});

test('interleave', () => {
	const models: PermittedContentChoice = {
		choice: [
			[
				{
					require: 'a',
				},
				{
					require: 'b',
				},
			],
			[
				{
					require: 'b',
				},
				{
					require: 'a',
				},
			],
		],
	};

	expect(c(models, '<a></a>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<b></b>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<a></a><b></b>').type).toBe('MATCHED');
	expect(c(models, '<b></b><a></a>').type).toBe('MATCHED');
	expect(c(models, '<b></b><a></a><c></c>').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c(models, '<b></b><a></a><a></a>').type).toBe('UNEXPECTED_EXTRA_NODE');
});

test('the dl element', () => {
	const models: PermittedContentChoice = {
		choice: [
			[
				{
					oneOrMore: [
						{
							zeroOrMore: ':model(script-supporting)',
						},
						{
							oneOrMore: 'dt',
						},
						{
							zeroOrMore: ':model(script-supporting)',
						},
						{
							oneOrMore: 'dd',
						},
						{
							zeroOrMore: ':model(script-supporting)',
						},
					],
				},
			],
			[
				{
					zeroOrMore: ':model(script-supporting)',
				},
				{
					oneOrMore: 'div',
				},
				{
					zeroOrMore: ':model(script-supporting)',
				},
			],
		],
	};

	expect(c(models, '<dt></dt><dd></dd>').type).toBe('MATCHED');
	expect(c(models, '').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '').query).toBe('dt');
	expect(c(models, '<dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
	expect(c(models, '<div></div>').type).toBe('MATCHED');
	expect(c(models, '<div></div><div></div>').type).toBe('MATCHED');
	expect(c(models, '<dt></dt><dd></dd><dt></dt>').type).toBe('MISSING_NODE_ONE_OR_MORE');
});

it('part of the ruby element', () => {
	const models: PermittedContentChoice = {
		// 2. One or the other of the following:
		choice: [
			[
				{
					// - One or more rt elements
					oneOrMore: 'rt',
				},
			],
			[
				{
					// - An rp element
					require: 'rp',
				},
				{
					// followed by one or more rt elements, each of which is itself followed by an rp element
					oneOrMore: [
						{
							require: 'rt',
						},
						{
							require: 'rp',
						},
					],
				},
			],
		],
	};

	expect(c(models, '<rt></rt>').type).toBe('MATCHED');
	expect(c(models, '<rp></rp>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rp></rp>').query).toBe('rt');
	expect(c(models, '<rt></rt><rt></rt>').type).toBe('MATCHED');
	expect(c(models, '<rp></rp><rt></rt><rp></rp>').type).toBe('MATCHED');
	expect(c(models, '<rp></rp><rt></rt>').type).toBe('MISSING_NODE_REQUIRED');
	expect(c(models, '<rp></rp><rt></rt>').query).toBe('rp');
	expect(c(models, '<rt></rt><rp></rp>').type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c(models, '<rt></rt><rp></rp>').query).toBe('rt');
});
