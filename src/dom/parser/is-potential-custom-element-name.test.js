import test from 'ava';
import isPotentialCustomElementName from '../../../lib/dom/parser/is-potential-custom-element-name';

test('div', (t) => t.false(isPotentialCustomElementName('div')));
test('html', (t) => t.false(isPotentialCustomElementName('html')));
test('svg', (t) => t.false(isPotentialCustomElementName('svg')));
test('textPath', (t) => t.false(isPotentialCustomElementName('textPath')));
test('custom-element', (t) => t.true(isPotentialCustomElementName('custom-element')));
test('custom-😁', (t) => t.true(isPotentialCustomElementName('custom-😁')));
test('a😁', (t) => t.false(isPotentialCustomElementName('a😁')));
test('a😁-element', (t) => t.true(isPotentialCustomElementName('a😁-element')));

// Exceptional true
// Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
test('invalid-UPPERCASE', (t) => t.true(isPotentialCustomElementName('invalid-UPPERCASE')));
