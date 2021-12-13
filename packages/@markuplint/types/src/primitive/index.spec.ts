import { isInt, isUint, isFloat, isNonZeroUint, isQuantity } from '.';

test('int', () => {
	expect(isInt('0')).toBe(true);
	expect(isInt('1')).toBe(true);
	expect(isInt('-0')).toBe(true);
	expect(isInt('-1')).toBe(true);
	expect(isInt('10')).toBe(true);
	expect(isInt('100')).toBe(true);
	expect(isInt('1.00')).toBe(false);
	expect(isInt('.001')).toBe(false);
	expect(isInt(' 1 ')).toBe(false);
	expect(isInt('- 1')).toBe(false);
});

test('uint', () => {
	expect(isUint('0')).toBe(true);
	expect(isUint('1')).toBe(true);
	expect(isUint('10')).toBe(true);
	expect(isUint('100')).toBe(true);
	expect(isUint('-0')).toBe(false);
	expect(isUint('-1')).toBe(false);
	expect(isUint('1.00')).toBe(false);
	expect(isUint('.001')).toBe(false);
	expect(isUint(' 1 ')).toBe(false);
	expect(isUint('- 1')).toBe(false);
});

test('float', () => {
	expect(isFloat('0')).toBe(true);
	expect(isFloat('1')).toBe(true);
	expect(isFloat('10')).toBe(true);
	expect(isFloat('100')).toBe(true);
	expect(isFloat('-0')).toBe(true);
	expect(isFloat('-1')).toBe(true);
	expect(isFloat('1.00')).toBe(true);
	expect(isFloat('.001')).toBe(true);
	expect(isFloat(' 1 ')).toBe(false);
	expect(isFloat('- 1')).toBe(false);
});

test('nonZeroUint', () => {
	expect(isNonZeroUint('0')).toBe(false);
	expect(isNonZeroUint('1')).toBe(true);
	expect(isNonZeroUint('10')).toBe(true);
	expect(isNonZeroUint('100')).toBe(true);
	expect(isNonZeroUint('-0')).toBe(false);
	expect(isNonZeroUint('-1')).toBe(false);
	expect(isNonZeroUint('1.00')).toBe(false);
	expect(isNonZeroUint('.001')).toBe(false);
	expect(isNonZeroUint(' 1 ')).toBe(false);
	expect(isNonZeroUint('- 1')).toBe(false);
});

test('quantity', () => {
	expect(isQuantity('0px', ['px', 'em'])).toBe(true);
	expect(isQuantity('.5px', ['px', 'em'])).toBe(true);
	expect(isQuantity('1.5em', ['px', 'em'])).toBe(true);
	expect(isQuantity('1.5cm', ['px', 'em'])).toBe(false);
	expect(isQuantity('1.5px', ['px', 'em'], 'int')).toBe(false);
	expect(isQuantity('-5px', ['px', 'em'], 'int')).toBe(true);
	expect(isQuantity('-5px', ['px', 'em'], 'uint')).toBe(false);
	expect(isQuantity('1.12e+21px', ['px', 'em'], 'float')).toBe(true);
	expect(isQuantity('1.12e+21px', ['px', 'em'], 'int')).toBe(false);
});
