import { floatCheck, intCheck, nonZeroUintCheck, uintCheck } from './type-check';

test('intCheck', () => {
	expect(intCheck('0')).toBe(true);
	expect(intCheck('1')).toBe(true);
	expect(intCheck('-0')).toBe(true);
	expect(intCheck('-1')).toBe(true);
	expect(intCheck('10')).toBe(true);
	expect(intCheck('100')).toBe(true);
	expect(intCheck('1.00')).toBe(false);
	expect(intCheck('.001')).toBe(false);
	expect(intCheck(' 1 ')).toBe(false);
	expect(intCheck('- 1')).toBe(false);
});

test('uintCheck', () => {
	expect(uintCheck('0')).toBe(true);
	expect(uintCheck('1')).toBe(true);
	expect(uintCheck('10')).toBe(true);
	expect(uintCheck('100')).toBe(true);
	expect(uintCheck('-0')).toBe(false);
	expect(uintCheck('-1')).toBe(false);
	expect(uintCheck('1.00')).toBe(false);
	expect(uintCheck('.001')).toBe(false);
	expect(uintCheck(' 1 ')).toBe(false);
	expect(uintCheck('- 1')).toBe(false);
});

test('floatCheck', () => {
	expect(floatCheck('0')).toBe(true);
	expect(floatCheck('1')).toBe(true);
	expect(floatCheck('10')).toBe(true);
	expect(floatCheck('100')).toBe(true);
	expect(floatCheck('-0')).toBe(true);
	expect(floatCheck('-1')).toBe(true);
	expect(floatCheck('1.00')).toBe(true);
	expect(floatCheck('.001')).toBe(true);
	expect(floatCheck(' 1 ')).toBe(false);
	expect(floatCheck('- 1')).toBe(false);
});

test('nonZeroUintCheck', () => {
	expect(nonZeroUintCheck('0')).toBe(false);
	expect(nonZeroUintCheck('1')).toBe(true);
	expect(nonZeroUintCheck('10')).toBe(true);
	expect(nonZeroUintCheck('100')).toBe(true);
	expect(nonZeroUintCheck('-0')).toBe(false);
	expect(nonZeroUintCheck('-1')).toBe(false);
	expect(nonZeroUintCheck('1.00')).toBe(false);
	expect(nonZeroUintCheck('.001')).toBe(false);
	expect(nonZeroUintCheck(' 1 ')).toBe(false);
	expect(nonZeroUintCheck('- 1')).toBe(false);
});
