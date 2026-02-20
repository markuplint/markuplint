import { describe, test, expect } from 'vitest';

import { compileDirectivePatterns, resolveDirective } from './directive-resolver.js';

describe('compileDirectivePatterns', () => {
	test('compiles patterns into RegExp objects', () => {
		const patterns = [{ pattern: '^x-data$', isDirective: true as const }];
		const compiled = compileDirectivePatterns(patterns);
		expect(compiled).toHaveLength(1);
		expect(compiled[0].regex).toBeInstanceOf(RegExp);
		expect(compiled[0].regex.source).toBe('^x-data$');
		expect(compiled[0].regex.flags).toBe('i');
	});

	test('respects custom flags', () => {
		const patterns = [{ pattern: '^x-data$', flags: '' }];
		const compiled = compileDirectivePatterns(patterns);
		expect(compiled[0].regex.flags).toBe('');
	});

	test('caches compiled patterns by reference', () => {
		const patterns = [{ pattern: '^x-data$' }];
		const first = compileDirectivePatterns(patterns);
		const second = compileDirectivePatterns(patterns);
		expect(first).toBe(second);
	});
});

describe('resolveDirective', () => {
	test('returns null when no patterns match', () => {
		const patterns = [{ pattern: '^x-data$', isDirective: true as const }];
		const compiled = compileDirectivePatterns(patterns);
		expect(resolveDirective('class', compiled)).toBeNull();
	});

	test('matches static directive pattern', () => {
		const patterns = [{ pattern: '^x-(?:data|init|show)$', isDirective: true as const }];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective('x-data', compiled);
		expect(result).toStrictEqual({
			potentialName: undefined,
			isDirective: true,
			isDynamicValue: undefined,
			valueType: undefined,
			isDuplicatable: undefined,
		});
	});

	test('resolves potentialName with capture group', () => {
		const patterns = [
			{
				pattern: '^(?:x-bind:|:)([^.]+)(?:\\.[^.]+)?$',
				potentialName: '$1',
				isDynamicValue: true as const,
				valueType: 'code' as const,
			},
		];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective(':href', compiled);
		expect(result?.potentialName).toBe('href');
		expect(result?.isDynamicValue).toBe(true);
		expect(result?.valueType).toBe('code');
	});

	test('resolves x-bind:class with modifier', () => {
		const patterns = [
			{
				pattern: '^(?:x-bind:|:)([^.]+)(?:\\.[^.]+)?$',
				potentialName: '$1',
				isDynamicValue: true as const,
				isDuplicatable: ['class', 'style'] as readonly string[],
			},
		];
		const compiled = compileDirectivePatterns(patterns);

		const classResult = resolveDirective('x-bind:class', compiled);
		expect(classResult?.potentialName).toBe('class');
		expect(classResult?.isDuplicatable).toBe(true);

		const hrefResult = resolveDirective(':href', compiled);
		expect(hrefResult?.potentialName).toBe('href');
		expect(hrefResult?.isDuplicatable).toBe(false);
	});

	test('resolves @click to onclick', () => {
		const patterns = [
			{
				pattern: '^(?:x-on:|@)([^.]+)(?:\\..+)?$',
				potentialName: 'on$1',
				isDirective: true as const,
				isDynamicValue: true as const,
			},
		];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective('@click', compiled);
		expect(result?.potentialName).toBe('onclick');
		expect(result?.isDirective).toBe(true);
	});

	test('resolves x-on:submit.prevent to onsubmit', () => {
		const patterns = [
			{
				pattern: '^(?:x-on:|@)([^.]+)(?:\\..+)?$',
				potentialName: 'on$1',
				isDirective: true as const,
				isDynamicValue: true as const,
			},
		];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective('x-on:submit.prevent', compiled);
		expect(result?.potentialName).toBe('onsubmit');
	});

	test('converts potentialName capture groups to lowercase', () => {
		const patterns = [
			{
				pattern: '^(?:x-on:|@)([^.]+)(?:\\..+)?$',
				potentialName: 'on$1',
				isDirective: true as const,
				isDynamicValue: true as const,
			},
		];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective('@Click', compiled);
		expect(result?.potentialName).toBe('onclick');
	});

	test('first matching pattern wins', () => {
		const patterns = [
			{ pattern: '^x-data$', isDirective: true as const, valueType: 'code' as const },
			{ pattern: '^x-', isDirective: true as const },
		];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective('x-data', compiled);
		expect(result?.valueType).toBe('code');
	});

	test('isDuplicatable: true makes all matches duplicatable', () => {
		const patterns = [
			{
				pattern: '^(?:x-bind:|:)([^.]+)$',
				potentialName: '$1',
				isDuplicatable: true as const,
			},
		];
		const compiled = compileDirectivePatterns(patterns);

		const result = resolveDirective(':anything', compiled);
		expect(result?.isDuplicatable).toBe(true);
	});

	describe('htmx patterns', () => {
		const htmxPatterns = [
			{
				pattern: '^hx-on([:-])htmx\\1(.+)$',
				potentialName: 'hx-on:htmx:$2',
				isDirective: true as const,
				isDynamicValue: true as const,
			},
			{
				pattern: '^hx-on[:-]{2}(.+)$',
				potentialName: 'hx-on:htmx:$1',
				isDirective: true as const,
				isDynamicValue: true as const,
			},
			{
				pattern: '^hx-on[:-]([a-z]+)$',
				potentialName: 'on$1',
				isDirective: true as const,
				isDynamicValue: true as const,
			},
		];
		const compiled = compileDirectivePatterns(htmxPatterns);

		test('resolves hx-on:click to onclick', () => {
			const result = resolveDirective('hx-on:click', compiled);
			expect(result?.potentialName).toBe('onclick');
		});

		test('resolves hx-on-click to onclick', () => {
			const result = resolveDirective('hx-on-click', compiled);
			expect(result?.potentialName).toBe('onclick');
		});

		test('resolves hx-on:htmx:load to hx-on:htmx:load', () => {
			const result = resolveDirective('hx-on:htmx:load', compiled);
			expect(result?.potentialName).toBe('hx-on:htmx:load');
		});

		test('resolves hx-on-htmx-load to hx-on:htmx:load', () => {
			const result = resolveDirective('hx-on-htmx-load', compiled);
			expect(result?.potentialName).toBe('hx-on:htmx:load');
		});

		test('resolves hx-on::load shorthand to hx-on:htmx:load', () => {
			const result = resolveDirective('hx-on::load', compiled);
			expect(result?.potentialName).toBe('hx-on:htmx:load');
		});
	});

	describe('x-transition patterns', () => {
		const patterns = [{ pattern: '^x-transition(?:$|:|\\.)', isDirective: true as const }];
		const compiled = compileDirectivePatterns(patterns);

		test('matches x-transition', () => {
			expect(resolveDirective('x-transition', compiled)).not.toBeNull();
		});

		test('matches x-transition:enter', () => {
			expect(resolveDirective('x-transition:enter', compiled)).not.toBeNull();
		});

		test('matches x-transition.duration.500ms', () => {
			expect(resolveDirective('x-transition.duration.500ms', compiled)).not.toBeNull();
		});

		test('does not match x-transitionfoo', () => {
			expect(resolveDirective('x-transitionfoo', compiled)).toBeNull();
		});
	});
});
