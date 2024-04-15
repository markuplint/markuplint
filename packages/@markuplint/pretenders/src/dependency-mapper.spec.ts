import { describe, test, expect } from 'vitest';

import { dependencyMapper } from './dependency-mapper.js';

describe('dependencyMapper', () => {
	test('B -> A', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['div']],
					['B', ['A']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'div',
			},
			{
				selector: 'B',
				_via: ['A'],
				as: 'div',
			},
		]);
	});

	test('E -> D -> C -> B -> A', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['div']],
					['B', ['A']],
					['C', ['B']],
					['D', ['C']],
					['E', ['D']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'div',
			},
			{
				selector: 'B',
				_via: ['A'],
				as: 'div',
			},
			{
				selector: 'C',
				_via: ['B', 'A'],
				as: 'div',
			},
			{
				selector: 'D',
				_via: ['C', 'B', 'A'],
				as: 'div',
			},
			{
				selector: 'E',
				_via: ['D', 'C', 'B', 'A'],
				as: 'div',
			},
		]);
	});

	test('Reverse Defined: E -> D -> C -> B -> A', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['E', ['D']],
					['D', ['C']],
					['C', ['B']],
					['B', ['A']],
					['A', ['div']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'div',
			},
			{
				selector: 'B',
				_via: ['A'],
				as: 'div',
			},
			{
				selector: 'C',
				_via: ['B', 'A'],
				as: 'div',
			},
			{
				selector: 'D',
				_via: ['C', 'B', 'A'],
				as: 'div',
			},
			{
				selector: 'E',
				_via: ['D', 'C', 'B', 'A'],
				as: 'div',
			},
		]);
	});

	test('Recursive', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['B']],
					['B', ['C']],
					['C', ['D']],
					['D', ['A']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'B',
				_via: ['B', 'C', 'D', '...[Recursive]'],
			},
			{
				selector: 'B',
				as: 'C',
				_via: ['C', 'D', 'A', '...[Recursive]'],
			},
			{
				selector: 'C',
				as: 'D',
				_via: ['D', 'A', 'B', '...[Recursive]'],
			},
			{
				selector: 'D',
				as: 'A',
				_via: ['A', 'B', 'C', '...[Recursive]'],
			},
		]);
	});
});
