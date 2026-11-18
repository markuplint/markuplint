import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { ObjectSpec, askBits, askBitsObjects, askPaths, askPathsObjects, askStream, askStreamObjects } from './ask.ts';
import { elementsOf } from './documents.ts';
import { encodeSpec, regionValues, type SpecLike } from './encode.ts';
import { VARIANTS, variantName } from './format.ts';
import { makeQuestions, pathsOf, type QuestionsFile } from './questions.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike;

const DOCUMENTS = [
	'<!doctype html><html lang="en"><head><title>t</title><meta charset="utf-8"></head><body>' +
		'<div class="a" role="button tab" aria-label="x" data-x="1" onclick="f()" x-y><p>text <a href="#" aria-hidden="true">l</a></p>' +
		'<svg viewBox="0 0 1 1"><rect width="1" height="1"></rect></svg><math><mi>x</mi></math><my-el slot="a"></my-el>' +
		'<input type="text" aria-invalid="false"><font color="red">f</font></div></body></html>',
];

const questions = makeQuestions(
	SPEC,
	DOCUMENTS.map(html => elementsOf(html)),
);

describe('elementsOf', () => {
	test('names the elements as the data does, with their attributes and their parents', () => {
		const elements = elementsOf(DOCUMENTS[0] ?? '');
		const names = elements.map(element => element.name);
		expect(names).toContain('svg:rect');
		expect(names).toContain('mml:mi');
		expect(names).toContain('my-el');
		const div = elements.find(element => element.name === 'div');
		expect(div?.attributes.map(([name]) => name)).toStrictEqual([
			'class',
			'role',
			'aria-label',
			'data-x',
			'onclick',
			'x-y',
		]);
		expect(div?.parent).toBe('body');
		expect(elements.find(element => element.name === 'html')?.parent).toBeNull();
	});
});

describe('elementsOf, for the names that the data keeps in camel case', () => {
	test('gives the name of an element and of an attribute of SVG as the parser gives it, and lowers those of HTML', () => {
		const elements = elementsOf(
			'<!DOCTYPE html><DIV CLASS="a"><svg viewBox="0 0 1 1"><clipPath id="c"></clipPath><feBlend in="x"></feBlend></svg></DIV>',
		);
		expect(elements.map(element => element.name)).toStrictEqual([
			'html',
			'head',
			'body',
			'div',
			'svg:svg',
			'svg:clipPath',
			'svg:feBlend',
		]);
		expect(elements.find(element => element.name === 'div')?.attributes).toStrictEqual([['class', 'a']]);
		expect(elements.find(element => element.name === 'svg:svg')?.attributes).toStrictEqual([
			['viewBox', '0 0 1 1'],
		]);
		expect(elements.find(element => element.name === 'svg:feBlend')?.parent).toBe('svg:svg');
	});

	test('asks the lookups of a camel case name, which the data has, and not those of a lower case one that it lacks', () => {
		const asked = makeQuestions(SPEC, [elementsOf('<svg><clipPath id="c" viewBox="0 0 1 1"></clipPath></svg>')]);
		expect(asked.strings).toContain('svg:clipPath');
		expect(asked.strings).toContain('viewBox');
		expect(asked.strings).not.toContain('svg:clippath');
	});
});

describe('the baseline over objects', () => {
	test('does not take the name of what every object has for a key of the data', () => {
		const objects = new ObjectSpec(regionValues(SPEC));
		const asked = makeQuestions(SPEC, [elementsOf('<div constructor="x" __proto__="y" toString="z"></div>')]);
		expect([...askStreamObjects(objects, asked)]).toStrictEqual(asked.streamAnswers);
		expect([...askPathsObjects(objects, asked)]).toStrictEqual(asked.pathAnswers);
	});
});

describe('makeQuestions', () => {
	test('asks the flags and the categories of every element, paths with and without an answer, and the stream', () => {
		const categories = Object.keys(SPEC.def?.['#contentModels'] ?? {}).length;
		expect(questions.bitAnswers.length).toBe((SPEC.specs as unknown[]).length * (4 + categories));
		expect(questions.pathAnswers.length).toBeGreaterThan(5000);
		expect(questions.pathAnswers.some(answer => answer === 0)).toBe(true);
		expect(questions.pathAnswers.some(answer => answer !== 0)).toBe(true);
		expect(questions.streamAnswers.length).toBeGreaterThan(100);
		expect(questions.streamAnswers.includes(2)).toBe(true);
	});

	test('gives the same questions each time, and the same numbers of answers as of questions', () => {
		const again = makeQuestions(
			SPEC,
			DOCUMENTS.map(html => elementsOf(html)),
		);
		expect(again).toStrictEqual(questions);
		expect(pathsOf(SPEC)).toStrictEqual(pathsOf(SPEC));
	});

	test('stops the stream at the limit', () => {
		const limited = makeQuestions(
			SPEC,
			DOCUMENTS.map(html => elementsOf(html)),
			{ streamLimit: 30 },
		);
		expect(limited.streamAnswers.length).toBeGreaterThanOrEqual(30);
		expect(limited.streamAnswers.length).toBeLessThan(questions.streamAnswers.length);
	});
});

describe('the answers of the data as objects', () => {
	const objects = new ObjectSpec(regionValues(SPEC));

	test('are what the questions say', () => {
		expect([...askBitsObjects(objects, questions)]).toStrictEqual(questions.bitAnswers);
		expect([...askPathsObjects(objects, questions)]).toStrictEqual(questions.pathAnswers);
		expect([...askStreamObjects(objects, questions)]).toStrictEqual(questions.streamAnswers);
	});
});

describe.each(VARIANTS)('a candidate (%o)', variant => {
	test(`${variantName(variant)}: answers every question as the data does`, () => {
		const packed = encodeSpec(SPEC, variant);
		const expected: QuestionsFile = questions;
		expect([...askBits(packed, expected)]).toStrictEqual(expected.bitAnswers);
		expect([...askPaths(packed, expected)]).toStrictEqual(expected.pathAnswers);
		expect([...askStream(packed, expected)]).toStrictEqual(expected.streamAnswers);
	});
});
