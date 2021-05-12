import { getNamespace } from './get-namespace';

describe('getNamespace', () => {
	it('div', () => {
		expect(getNamespace('div')).toBe('http://www.w3.org/1999/xhtml');
		expect(getNamespace('span')).toBe('http://www.w3.org/1999/xhtml');
		expect(getNamespace('html')).toBe('http://www.w3.org/1999/xhtml');
	});

	it('svg', () => {
		expect(getNamespace('svg')).toBe('http://www.w3.org/2000/svg');
		expect(getNamespace('g', 'http://www.w3.org/2000/svg')).toBe('http://www.w3.org/2000/svg');
		expect(getNamespace('rect', 'http://www.w3.org/2000/svg')).toBe('http://www.w3.org/2000/svg');
	});

	it('MathML', () => {
		expect(getNamespace('math')).toBe('http://www.w3.org/1998/Math/MathML');
		expect(getNamespace('msqrt', 'http://www.w3.org/1998/Math/MathML')).toBe('http://www.w3.org/1998/Math/MathML');
		expect(getNamespace('mn', 'http://www.w3.org/1998/Math/MathML')).toBe('http://www.w3.org/1998/Math/MathML');
	});
});
