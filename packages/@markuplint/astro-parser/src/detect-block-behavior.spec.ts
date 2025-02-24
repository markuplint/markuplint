import { test, expect } from 'vitest';

import { detectBlockBehavior } from './detect-block-behavior.js';

test('Basic', () => {
	expect(detectBlockBehavior('{items.map(function (item) { const a = "foo"; return ')?.type).toBe('each');
	expect(detectBlockBehavior('{items.map( (item) => { const a = "foo"; return ')?.type).toBe('each');
	expect(detectBlockBehavior('{items.map( (item) => (')?.type).toBe('each');
	expect(detectBlockBehavior('{items.map( (item) => ')?.type).toBe('each');
	expect(detectBlockBehavior('{foo.items.map( (item) => ')?.type).toBe('each');
	expect(detectBlockBehavior('{foo.bar.$$items.map( (item) => ')?.type).toBe('each');
	expect(detectBlockBehavior('{items.forEach( (item) => ')?.type).toBeUndefined();
});
