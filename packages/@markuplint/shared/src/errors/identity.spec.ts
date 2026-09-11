import { describe, expect, test } from 'vitest';

import {
	ConfigParserError as ConfigParserErrorFromParserUtils,
	ParserError as ParserErrorFromParserUtils,
	TargetParserError as TargetParserErrorFromParserUtils,
} from '@markuplint/parser-utils';
import {
	ConfigParserError as ConfigParserErrorFromShared,
	ParserError as ParserErrorFromShared,
	TargetParserError as TargetParserErrorFromShared,
} from '@markuplint/shared';

describe('re-exported error class identity', () => {
	test('ParserError from parser-utils is the same class as from shared', () => {
		expect(ParserErrorFromParserUtils).toBe(ParserErrorFromShared);
		const err = new ParserErrorFromParserUtils('test', { line: 1, col: 1 });
		expect(err).toBeInstanceOf(ParserErrorFromShared);
	});

	test('TargetParserError from parser-utils is the same class as from shared', () => {
		expect(TargetParserErrorFromParserUtils).toBe(TargetParserErrorFromShared);
	});

	test('ConfigParserError from parser-utils is the same class as from shared', () => {
		expect(ConfigParserErrorFromParserUtils).toBe(ConfigParserErrorFromShared);
	});
});
