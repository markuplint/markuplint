import combination from './array.combination';

test('length 1', () => {
	expect(combination([0])).toEqual([[0]]);
	expect(combination([0, 0])).toEqual([[0]]);
});

test('length 2', () => {
	expect(combination([0, 1])).toEqual([
		[0, 1],
		[1, 0],
	]);
	expect(combination([1, 0])).toEqual([
		[0, 1],
		[1, 0],
	]);
});

test('length 3', () => {
	expect(combination([0, 1, 2])).toEqual([
		[0, 1, 2],
		[0, 2, 1],
		[1, 0, 2],
		[1, 2, 0],
		[2, 0, 1],
		[2, 1, 0],
	]);
});

test('length 4', () => {
	expect(combination([0, 1, 2, 3])).toEqual([
		[0, 1, 2, 3],
		[0, 1, 3, 2],
		[0, 2, 1, 3],
		[0, 2, 3, 1],
		[0, 3, 1, 2],
		[0, 3, 2, 1],
		[1, 0, 2, 3],
		[1, 0, 3, 2],
		[1, 2, 0, 3],
		[1, 2, 3, 0],
		[1, 3, 0, 2],
		[1, 3, 2, 0],
		[2, 0, 1, 3],
		[2, 0, 3, 1],
		[2, 1, 0, 3],
		[2, 1, 3, 0],
		[2, 3, 0, 1],
		[2, 3, 1, 0],
		[3, 0, 1, 2],
		[3, 0, 2, 1],
		[3, 1, 0, 2],
		[3, 1, 2, 0],
		[3, 2, 0, 1],
		[3, 2, 1, 0],
	]);
});
