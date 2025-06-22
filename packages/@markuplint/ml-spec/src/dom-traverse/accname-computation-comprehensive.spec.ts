import { createJSDOMElement as c } from '@markuplint/test-tools';
import { test, expect, describe } from 'vitest';

import { getAccname } from './accname-computation.js';

describe('HTML-AAM §4.1 Comprehensive Accessible Name Computation Tests', () => {
	describe('§4.1.1 Input text types and textarea', () => {
		test('input type="text" with label', () => {
			const container = c('<div><label for="test">Label text</label><input id="test" type="text" /></div>');
			const input = container.querySelector('input')!;
			expect(getAccname(input)).toBe('Label text');
		});

		test('input type="password" with placeholder', () => {
			expect(getAccname(c('<input type="password" placeholder="Enter password" />'))).toBe('Enter password');
		});

		test('input type="email" with title fallback', () => {
			expect(getAccname(c('<input type="email" title="Email address" />'))).toBe('Email address');
		});

		test('textarea with label and placeholder', () => {
			const container = c('<div><label for="test">Main label</label><textarea id="test" placeholder="Placeholder text"></textarea></div>');
			const textarea = container.querySelector('textarea')!;
			expect(getAccname(textarea)).toBe('Main label');
		});
	});

	describe('§4.1.2 Input button types', () => {
		test('input type="submit" with value', () => {
			expect(getAccname(c('<input type="submit" value="Send Form" />'))).toBe('Send Form');
		});

		test('input type="submit" without value uses default', () => {
			expect(getAccname(c('<input type="submit" />'))).toBe('Submit');
		});

		test('input type="reset" without value uses default', () => {
			expect(getAccname(c('<input type="reset" />'))).toBe('Reset');
		});

		test('input type="button" with value', () => {
			expect(getAccname(c('<input type="button" value="Click me" />'))).toBe('Click me');
		});
	});

	describe('§4.1.3 Input image type', () => {
		test('input type="image" with alt', () => {
			expect(getAccname(c('<input type="image" alt="Submit button" />'))).toBe('Submit button');
		});

		test('input type="image" with title fallback', () => {
			expect(getAccname(c('<input type="image" title="Submit form" />'))).toBe('Submit form');
		});

		test('input type="image" with value fallback', () => {
			expect(getAccname(c('<input type="image" value="Submit" />'))).toBe('Submit');
		});

		test('input type="image" without any attributes uses default', () => {
			expect(getAccname(c('<input type="image" />'))).toBe('Submit Query');
		});
	});

	describe('§4.1.4 Button element', () => {
		test('button with text content', () => {
			expect(getAccname(c('<button>Click me</button>'))).toBe('Click me');
		});

		test('button with nested elements', () => {
			expect(getAccname(c('<button><span>Nested</span> text</button>'))).toBe('Nested text');
		});

		test('button with title fallback', () => {
			expect(getAccname(c('<button title="Button description"></button>'))).toBe('Button description');
		});
	});

	describe('§4.1.5 Fieldset element', () => {
		test('fieldset with legend', () => {
			const fieldset = c('<fieldset><legend>Personal Information</legend><input type="text" /></fieldset>');
			expect(getAccname(fieldset)).toBe('Personal Information');
		});

		test('fieldset with title fallback', () => {
			expect(getAccname(c('<fieldset title="Form section"><input type="text" /></fieldset>'))).toBe('Form section');
		});
	});

	describe('§4.1.6 Output element', () => {
		test('output with associated label', () => {
			const container = c('<div><label for="result">Result:</label><output id="result">42</output></div>');
			const output = container.querySelector('output')!;
			expect(getAccname(output)).toBe('Result:');
		});

		test('output with title fallback', () => {
			expect(getAccname(c('<output title="Calculation result">42</output>'))).toBe('Calculation result');
		});
	});

	describe('§4.1.7 Other form elements', () => {
		test('select with label', () => {
			const container = c('<div><label for="options">Choose:</label><select id="options"><option>A</option></select></div>');
			const select = container.querySelector('select')!;
			expect(getAccname(select)).toBe('Choose:');
		});

		test('progress with title', () => {
			expect(getAccname(c('<progress title="Loading progress" value="50" max="100">50%</progress>'))).toBe('Loading progress');
		});

		test('meter with title', () => {
			expect(getAccname(c('<meter title="Disk usage" value="6" min="0" max="10">60%</meter>'))).toBe('Disk usage');
		});
	});

	describe('§4.1.8 Summary element', () => {
		test('summary with text content', () => {
			expect(getAccname(c('<summary>Click to expand</summary>'))).toBe('Click to expand');
		});

		test('summary with title fallback', () => {
			expect(getAccname(c('<summary title="Expand details"></summary>'))).toBe('Expand details');
		});
	});

	describe('§4.1.9 Figure element', () => {
		test('figure with figcaption', () => {
			const figure = c('<figure><img src="chart.png" alt="Chart" /><figcaption>Sales Chart</figcaption></figure>');
			expect(getAccname(figure)).toBe('Sales Chart');
		});

		test('figure with title fallback', () => {
			expect(getAccname(c('<figure title="Image figure"><img src="image.png" alt="Image" /></figure>'))).toBe('Image figure');
		});
	});

	describe('§4.1.10 Img element', () => {
		test('img with alt', () => {
			expect(getAccname(c('<img alt="Company logo" src="logo.png" />'))).toBe('Company logo');
		});

		test('img with empty alt', () => {
			expect(getAccname(c('<img alt="" src="decorative.png" />'))).toBe('');
		});

		test('img with title fallback', () => {
			expect(getAccname(c('<img title="Hover text" src="image.png" />'))).toBe('Hover text');
		});
	});

	describe('§4.1.11 Table element', () => {
		test('table with caption', () => {
			const table = c('<table><caption>Monthly Sales</caption><tr><td>Data</td></tr></table>');
			expect(getAccname(table)).toBe('Monthly Sales');
		});

		test('table with title fallback', () => {
			expect(getAccname(c('<table title="Data table"><tr><td>Data</td></tr></table>'))).toBe('Data table');
		});
	});

	describe('§4.1.12 Table cell elements', () => {
		test('td with title', () => {
			const container = c('<table><tr><td title="Cell description">Data</td></tr></table>');
			const td = container.querySelector('td')!;
			expect(getAccname(td)).toBe('Cell description');
		});

		test('th with title', () => {
			const container = c('<table><tr><th title="Header description">Header</th></tr></table>');
			const th = container.querySelector('th')!;
			expect(getAccname(th)).toBe('Header description');
		});

		test('tr with title', () => {
			const container = c('<table><tr title="Row description"><td>Data</td></tr></table>');
			const tr = container.querySelector('tr')!;
			expect(getAccname(tr)).toBe('Row description');
		});
	});

	describe('§4.1.13 Anchor element', () => {
		test('a with text content', () => {
			expect(getAccname(c('<a href="/">Home page</a>'))).toBe('Home page');
		});

		test('a with nested elements', () => {
			expect(getAccname(c('<a href="/"><span>Go to</span> home</a>'))).toBe('Go to home');
		});

		test('a with title fallback', () => {
			expect(getAccname(c('<a href="/" title="Navigate home"></a>'))).toBe('Navigate home');
		});
	});

	describe('§4.1.14 Area element', () => {
		test('area with alt', () => {
			expect(getAccname(c('<area alt="Link to section" coords="0,0,50,50" />'))).toBe('Link to section');
		});

		test('area with title fallback', () => {
			expect(getAccname(c('<area title="Clickable region" coords="0,0,50,50" />'))).toBe('Clickable region');
		});
	});

	describe('§4.1.15 Iframe element', () => {
		test('iframe with title', () => {
			expect(getAccname(c('<iframe title="External content" src="content.html"></iframe>'))).toBe('External content');
		});

		test('iframe with name fallback', () => {
			expect(getAccname(c('<iframe name="content-frame" src="content.html"></iframe>'))).toBe('content-frame');
		});
	});

	describe('§4.1.16 Section and grouping elements', () => {
		test('section with title', () => {
			expect(getAccname(c('<section title="Main content">Content here</section>'))).toBe('Main content');
		});

		test('article with title', () => {
			expect(getAccname(c('<article title="Blog post">Post content</article>'))).toBe('Blog post');
		});

		test('div without title returns empty', () => {
			expect(getAccname(c('<div>Content</div>'))).toBe('');
		});
	});

	describe('§4.1.17 Text-level elements', () => {
		test('span with title', () => {
			expect(getAccname(c('<span title="Tooltip text">Text</span>'))).toBe('Tooltip text');
		});

		test('strong with title', () => {
			expect(getAccname(c('<strong title="Important note">Bold text</strong>'))).toBe('Important note');
		});

		test('em without title returns empty', () => {
			expect(getAccname(c('<em>Emphasized text</em>'))).toBe('');
		});
	});

	describe('ARIA precedence tests', () => {
		test('aria-labelledby takes precedence over element-specific logic', () => {
			const container = c('<div><span id="ref">ARIA label</span><img alt="Alt text" aria-labelledby="ref" /></div>');
			const img = container.querySelector('img')!;
			expect(getAccname(img)).toBe('ARIA label');
		});

		test('aria-label takes precedence over element-specific logic', () => {
			expect(getAccname(c('<img alt="Alt text" aria-label="ARIA label" />'))).toBe('ARIA label');
		});

		test('elements with explicit roles use accname library', () => {
			const complex = c('<div role="checkbox" aria-checked="false">Flash the screen <span role="textbox" aria-multiline="false"> 5 </span> times</div>');
			expect(getAccname(complex)).toBe('Flash the screen 5 times');
		});
	});

	describe('Edge cases and combinations', () => {
		test('input with both label and placeholder prefers label', () => {
			const container = c('<div><label for="test">Label</label><input id="test" type="text" placeholder="Placeholder" /></div>');
			const input = container.querySelector('input')!;
			expect(getAccname(input)).toBe('Label');
		});

		test('button with both content and title prefers content', () => {
			expect(getAccname(c('<button title="Title text">Button text</button>'))).toBe('Button text');
		});

		test('img with both alt and title prefers alt', () => {
			expect(getAccname(c('<img alt="Alt text" title="Title text" />'))).toBe('Alt text');
		});

		test('elements with hidden content exclude hidden parts', () => {
			expect(getAccname(c('<button>Visible <span aria-hidden="true">Hidden</span> text</button>'))).toBe('Visible  text');
		});
	});
});