import { describe, it, expect } from 'vitest';

import { githubReporter } from './github-reporter.js';

describe('githubReporter', () => {
	it('outputs no violations', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			status: 'processed',
			violations: [],
		});
		expect(result).toEqual([]);
	});

	it('outputs violations', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			status: 'processed',
			violations: [
				{
					severity: 'error',
					message: 'error message',
					reason: 'error reason',
					line: 1,
					col: 2,
					raw: 'error raw',
					ruleId: 'error-id',
				},
				{
					severity: 'info',
					message: 'info message',
					reason: 'info reason',
					line: 3,
					col: 4,
					raw: 'info raw',
					ruleId: 'info-id',
				},
				{
					severity: 'warning',
					message: 'warning message',
					reason: 'warning reason',
					line: 5,
					col: 6,
					raw: 'warning raw',
					ruleId: 'warning-id',
				},
				{
					severity: 'warning',
					message: 'warning message',
					reason: undefined,
					line: 7,
					col: 8,
					raw: 'warning raw',
					ruleId: 'warning-id',
				},
			],
		});
		expect(result).toEqual([
			'::error file=/path/to/file.html,line=1,col=2::error message / error reason (error-id)',
			'::notice file=/path/to/file.html,line=3,col=4::info message / info reason (info-id)',
			'::warning file=/path/to/file.html,line=5,col=6::warning message / warning reason (warning-id)',
			'::warning file=/path/to/file.html,line=7,col=8::warning message (warning-id)',
		]);
	});

	it('uses violation.name as display name when present', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			status: 'processed',
			violations: [
				{
					severity: 'error',
					message: 'Missing attr',
					reason: 'alt is required',
					line: 1,
					col: 1,
					raw: '<img>',
					ruleId: 'required-attr',
					name: 'a11y/img-alt',
				},
			],
		});
		expect(result).toEqual([
			'::error file=/path/to/file.html,line=1,col=1::Missing attr / alt is required (a11y/img-alt)',
		]);
	});

	it('includes specConformance tag when present', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			status: 'processed',
			violations: [
				{
					severity: 'error',
					message: 'Not allowed here',
					reason: 'content model violation',
					specConformance: 'normative',
					line: 1,
					col: 1,
					raw: '<div>',
					ruleId: 'permitted-contents',
					name: 'html-standard/permitted-contents',
				},
			],
		});
		expect(result).toEqual([
			'::error file=/path/to/file.html,line=1,col=1::Not allowed here [normative] / content model violation (html-standard/permitted-contents)',
		]);
	});

	it('omits specConformance tag when absent', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			status: 'processed',
			violations: [
				{
					severity: 'warning',
					message: 'Some issue',
					line: 1,
					col: 1,
					raw: '<div>',
					ruleId: 'some-rule',
				},
			],
		});
		expect(result).toEqual(['::warning file=/path/to/file.html,line=1,col=1::Some issue (some-rule)']);
	});

	it('falls back to ruleId when violation.name is undefined', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			status: 'processed',
			violations: [
				{
					severity: 'warning',
					message: 'Missing attr',
					reason: undefined,
					line: 2,
					col: 3,
					raw: '<input>',
					ruleId: 'required-attr',
				},
			],
		});
		expect(result).toEqual(['::warning file=/path/to/file.html,line=2,col=3::Missing attr (required-attr)']);
	});
});
