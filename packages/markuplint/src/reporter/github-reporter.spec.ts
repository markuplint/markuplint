import { describe, it, expect } from 'vitest';

import { githubReporter } from './github-reporter';

describe('githubReporter', () => {
	it('outputs no violations', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
			violations: [],
		});
		expect(result).toEqual([]);
	});

	it('outputs violations', () => {
		const result = githubReporter({
			filePath: '/path/to/file.html',
			fixedCode: '',
			sourceCode: '',
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
});
