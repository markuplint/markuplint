import { describe, expect, test } from 'vitest';

import { extractSection, pageText, parsePage } from './extract.ts';

/** The shape of html.spec.whatwg.org and momdo.github.io: headings are flat children of `body`. */
const FLAT = `<!doctype html><body>
<h4 id="the-select-element"><span class="secno">4.10.7</span> The <dfn>select</dfn> element<a href="#the-select-element" class="self-link"></a></h4>
<aside class="mdn-anno"><b>MDN</b> annotation with browser versions</aside>
<p>The select element represents a control.</p>
<div data-algorithm=""><p>If a select element has a required attribute, then <dfn id="placeholder-label-option">placeholder label option</dfn>.</p></div>
<p class="note">Note: keep this.</p>
<h5 id="sub"><span class="secno">4.10.7.1</span> Subsection</h5>
<p>Sub text.</p>
<h4 id="next"><span class="secno">4.10.8</span> Next</h4>
<p>Next text.</p>
<h6 id="file-upload-state-(type=file)"><span class="secno">4.10.5.1.17</span> File Upload state</h6>
<p id="the-select-element:the-select-element-6">Generated id.</p>
<script>var hidden = 'not text';</script>
</body>`;

/** The shape of w3c.github.io/aria and the like: nested `section`s, headings inside `div.header-wrapper`. */
const RESPEC = `<!doctype html><body>
<section id="roles"><div class="header-wrapper"><h3 id="x-roles"><bdi class="secno">5.4 </bdi> Roles<a class="self-link" href="#x-roles"></a></h3></div>
<p>Intro.</p>
<section class="role notoc" id="tab"><h4><code>tab</code> role</h4><p>Tab text.</p></section>
<section id="tabpanel"><div class="header-wrapper"><h4 id="h-tabpanel"><bdi class="secno">5.4.2 </bdi> tabpanel</h4></div><p>Panel text.</p></section>
</section>
<ol class="acc-ol"><li id="comp_label"><span id="step2D"></span>Label step text.</li></ol>
</body>`;

describe('parsePage', () => {
	test('[extract-001] flags an unprocessed ReSpec source by its script', () => {
		expect(
			parsePage(
				'<script class="remove" src="https://www.w3.org/Tools/respec/respec-w3c"></script><h2 id="a">A</h2>',
			).unprocessed,
		).toBe(true);
		expect(parsePage(RESPEC).unprocessed).toBe(false);
	});

	test('[extract-016] does not take a numbered page for an unrendered source because it loads a respec script', () => {
		const html =
			'<script src="https://example.com/respec-highlight.js"></script><h2 id="a"><span class="secno">1</span> A</h2>';
		expect(parsePage(html).unprocessed).toBe(false);
	});
});

describe('extractSection on a flat page', () => {
	const page = parsePage(FLAT);

	test('[extract-002] a heading hashes its own prose up to the next heading of any level', () => {
		const section = extractSection(page, 'the-select-element');
		expect(section).toStrictEqual({
			status: 'found',
			unit: 'The select element The select element represents a control. If a select element has a required attribute, then placeholder label option. Note: keep this.',
			scope: expect.stringContaining('Sub text.'),
			secno: '4.10.7',
		});
	});

	test('[extract-003] the scope of a heading runs to the next heading of the same or a higher level', () => {
		const section = extractSection(page, 'the-select-element');
		expect(section.status === 'found' && section.scope).not.toContain('Next text.');
		expect(section.status === 'found' && section.scope).toContain('Subsection Sub text.');
	});

	test('[extract-004] drops annotations, self links and section numbers from the text', () => {
		const section = extractSection(page, 'the-select-element');
		expect(section.status === 'found' && section.unit).not.toContain('MDN');
		expect(section.status === 'found' && section.unit).not.toContain('4.10.7');
	});

	test('[extract-005] a defined term hashes the algorithm that holds it and looks quotes up in its section', () => {
		const section = extractSection(page, 'placeholder-label-option');
		expect(section).toStrictEqual({
			status: 'found',
			unit: 'If a select element has a required attribute, then placeholder label option.',
			scope: expect.stringContaining('Sub text.'),
			secno: '4.10.7',
		});
	});

	test('[extract-006] finds an id by exact comparison, even one a CSS selector would need escaped', () => {
		expect(extractSection(page, 'file-upload-state-(type=file)')).toMatchObject({
			status: 'found',
			secno: '4.10.5.1.17',
		});
		expect(extractSection(page, 'the-select-element:the-select-element-6')).toMatchObject({
			status: 'found',
			unit: 'Generated id.',
		});
	});

	test('[extract-007] reports an id that is not on the page', () => {
		expect(extractSection(page, 'comp_aria_label')).toStrictEqual({ status: 'missing' });
	});
});

describe('extractSection on an id inside a heading', () => {
	test('[extract-015] an empty alias inside a heading stands for the heading', () => {
		const page = parsePage(
			'<body><h4 id="headings-and-outlines-2"><span class="secno">4.3.11</span> <span id="headings-and-outlines"></span>Headings and outlines</h4><p>Each heading has a level.</p><h4 id="next"><span class="secno">4.3.12</span> Next</h4></body>',
		);
		expect(extractSection(page, 'headings-and-outlines')).toStrictEqual(
			extractSection(page, 'headings-and-outlines-2'),
		);
		expect(extractSection(page, 'headings-and-outlines')).toMatchObject({
			unit: 'Headings and outlines Each heading has a level.',
			secno: '4.3.11',
		});
	});
});

describe('extractSection on a ReSpec page', () => {
	const page = parsePage(RESPEC);

	test('[extract-008] a section hashes its own prose without the sections inside it', () => {
		const section = extractSection(page, 'roles');
		expect(section).toMatchObject({ status: 'found', unit: 'Roles Intro.', secno: '5.4' });
		expect(section.status === 'found' && section.scope).toContain('Tab text.');
	});

	test('[extract-009] a section with no numbered heading has no section number', () => {
		expect(extractSection(page, 'tab')).toMatchObject({ status: 'found', unit: 'tab role Tab text.', secno: null });
	});

	test('[extract-010] a heading inside the header wrapper stands for its section', () => {
		expect(extractSection(page, 'h-tabpanel')).toMatchObject({
			status: 'found',
			unit: 'tabpanel Panel text.',
			secno: '5.4.2',
		});
	});

	test('[extract-011] a list item is its own unit', () => {
		expect(extractSection(page, 'comp_label')).toMatchObject({ status: 'found', unit: 'Label step text.' });
	});
});

describe('extractSection on an old page', () => {
	test('[extract-014] resolves a fragment to an anchor named by name, as a browser does, after every id', () => {
		const page = parsePage(
			'<body><p><a name="Timing-ClockValueSyntax"></a>Clock values are written like this.</p><p id="Timing-ClockValueSyntax">An id wins.</p><p><a name="only-named"></a>Named only.</p></body>',
		);
		expect(extractSection(page, 'Timing-ClockValueSyntax')).toMatchObject({ status: 'found', unit: 'An id wins.' });
		expect(extractSection(page, 'only-named')).toMatchObject({ status: 'found', unit: 'Named only.' });
	});
});

describe('text normalization', () => {
	test('[extract-012] joins Japanese text broken across source lines', () => {
		const page = parsePage(
			'<h5 id="a"><span class="secno">13.1.2.3</span> 属性</h5>\n<p id="p">属性は\n名前を\n持つ。</p>',
		);
		expect(extractSection(page, 'p')).toMatchObject({ unit: '属性は名前を持つ。' });
	});

	test('[extract-013] pageText leaves out script and style content', () => {
		const text = pageText(parsePage(FLAT));
		expect(text).toContain('Next text.');
		expect(text).not.toContain('not text');
	});
});

/** The shape of docs.astro.build (Starlight): each heading is wrapped, with its anchor link, in `div.sl-heading-wrapper`. */
const STARLIGHT = `<!doctype html><body>
<div class="sl-heading-wrapper level-h3"><h3 id="dynamic-attributes">Dynamic Attributes</h3><a class="sl-anchor-link" href="#dynamic-attributes"><span aria-hidden="true">#</span><span class="sr-only">Section titled “Dynamic Attributes”</span></a></div>
<p>Local variables can be used in curly braces.</p>
<div class="sl-heading-wrapper level-h4"><h4 id="sub">Sub</h4><a class="sl-anchor-link" href="#sub"><span class="sr-only">Section titled “Sub”</span></a></div>
<p>Sub text.</p>
<div class="sl-heading-wrapper level-h3"><h3 id="dynamic-html">Dynamic HTML</h3><a class="sl-anchor-link" href="#dynamic-html"><span class="sr-only">Section titled “Dynamic HTML”</span></a></div>
<p>Next text.</p>
</body>`;

describe('extractSection on a page whose headings are wrapped with their anchor links', () => {
	test('[extract-017] takes the prose that follows the wrapper as the section, and the anchor link as no text', () => {
		const section = extractSection(parsePage(STARLIGHT), 'dynamic-attributes');
		expect(section).toMatchObject({
			status: 'found',
			unit: 'Dynamic Attributes Local variables can be used in curly braces.',
		});
		expect(section).toMatchObject({
			scope: 'Dynamic Attributes Local variables can be used in curly braces. Sub Sub text.',
		});
	});

	test('[extract-018] ends a section at the next wrapped heading of the same level, and not before a deeper one', () => {
		expect(extractSection(parsePage(STARLIGHT), 'sub')).toMatchObject({ unit: 'Sub Sub text.' });
		expect(extractSection(parsePage(STARLIGHT), 'dynamic-html')).toMatchObject({
			unit: 'Dynamic HTML Next text.',
		});
	});
});

/** The shape of svgwg.org/svg2-draft: the id of an element is on the paragraph that introduces it, and its definition follows in `div.element-summary`. */
const SVG_ELEMENT = `<!doctype html><body>
<h3 id="Gradients">14.2.2. Linear gradients</h3>
<p id="LinearGradientElement">Linear gradients are defined by a linearGradient element.</p>

<div class="element-summary"><div class="element-summary-name"><dfn id="elementdef-linearGradient">linearGradient</dfn></div><dl><dt>Categories:</dt><dd>Gradient element</dd><dt>Content model:</dt><dd>Any number of descriptive elements.</dd></dl></div>
<p id="Attributes">An unrelated paragraph that follows.</p>
<p id="Plain">A paragraph with no definition after it.</p>
<p>Another one.</p>
<h3 id="Stops">14.2.4. Gradient stops</h3>
<p id="StopElement">The vector of colors is defined by the stop element.</p>
<p class="annotation">In SVG 1.1, the above read otherwise.</p>
<div class="element-summary"><div class="element-summary-name"><dfn id="elementdef-stop">stop</dfn></div><dl><dt>Categories:</dt><dd>None</dd></dl></div>
<h3 id="Shapes">9.2. Shapes</h3>
<p id="ShapesIntro">An introduction that names no element.</p>
<p id="RectElement">The rect element defines a rectangle.</p>
<div class="element-summary"><div class="element-summary-name"><dfn id="elementdef-rect">rect</dfn></div><dl><dt>Categories:</dt><dd>Shape element</dd></dl></div>
</body>`;

describe('extractSection of an element that is introduced by a paragraph', () => {
	test('[extract-019] takes the definition box that follows the paragraph as part of its unit', () => {
		const section = extractSection(parsePage(SVG_ELEMENT), 'LinearGradientElement');
		expect(section).toMatchObject({ status: 'found' });
		expect(section.status === 'found' && section.unit).toBe(
			'Linear gradients are defined by a linearGradient element. linearGradient Categories: Gradient element Content model: Any number of descriptive elements.',
		);
	});

	test('[extract-020] leaves a paragraph that no definition box follows as its own unit', () => {
		expect(extractSection(parsePage(SVG_ELEMENT), 'Plain')).toMatchObject({
			unit: 'A paragraph with no definition after it.',
		});
		expect(extractSection(parsePage(SVG_ELEMENT), 'Attributes')).toMatchObject({
			unit: 'An unrelated paragraph that follows.',
		});
	});

	test('[extract-021] finds the definition box past a note that sits between it and the paragraph, and leaves the note out', () => {
		const section = extractSection(parsePage(SVG_ELEMENT), 'StopElement');
		expect(section.status === 'found' && section.unit).toBe(
			'The vector of colors is defined by the stop element. stop Categories: None',
		);
	});

	test('[extract-022] takes the box for the element that the anchor names, not for a paragraph that merely comes before it', () => {
		expect(extractSection(parsePage(SVG_ELEMENT), 'ShapesIntro')).toMatchObject({
			unit: 'An introduction that names no element.',
		});
		const section = extractSection(parsePage(SVG_ELEMENT), 'RectElement');
		expect(section.status === 'found' && section.unit).toBe(
			'The rect element defines a rectangle. rect Categories: Shape element',
		);
	});
});

/** The shape of a definition list of the HTML Standard: terms that share one description are consecutive `dt`s before it. */
const TERMS = `<!doctype html><body>
<h3 id="obsolete">Non-conforming features</h3>
<dl>
<dt><dfn id="basefont"><code>basefont</code></dfn>
<dt><dfn id="font"><code>font</code></dfn>
<dd><p>Use appropriate elements or CSS instead.</p>
<p>Where the tt element was used, consider kbd.</p>
<dt><dfn id="xmp"><code>xmp</code></dfn>
<dd><p>Use pre instead.</p>
</dl>
<p id="after">A paragraph after the list.</p>
</body>`;

describe('extractSection of a term in a definition list', () => {
	test('[extract-023] takes the description that follows the terms as part of the unit, for each of the terms that share it', () => {
		const unit = (id: string) => {
			const section = extractSection(parsePage(TERMS), id);
			return section.status === 'found' ? section.unit : null;
		};
		expect(unit('font')).toBe(
			'font Use appropriate elements or CSS instead. Where the tt element was used, consider kbd.',
		);
		expect(unit('basefont')).toBe(
			'basefont Use appropriate elements or CSS instead. Where the tt element was used, consider kbd.',
		);
	});

	test('[extract-024] stops the description at the next term', () => {
		const section = extractSection(parsePage(TERMS), 'xmp');
		expect(section.status === 'found' && section.unit).toBe('xmp Use pre instead.');
	});

	test('[extract-025] leaves a term that no description follows as the term alone', () => {
		const page = parsePage(
			'<!doctype html><body><dl><dt><dfn id="lone">lone</dfn></dl><p>Text after the list.</p></body>',
		);
		const section = extractSection(page, 'lone');
		expect(section.status === 'found' && section.unit).toBe('lone');
	});

	test('[extract-026] finds the box of an element whose id is its name (`AElement`) and of one that shares a section (`TextElement`)', () => {
		const page = parsePage(`<!doctype html><body>
<h3 id="Links">The a element</h3>
<p id="AElement">The a element creates a hyperlink.</p>
<div class="element-summary"><div class="element-summary-name"><dfn id="elementdef-a">a</dfn></div><dl><dt>Categories:</dt><dd>Container element</dd></dl></div>
<h3 id="Text">Text</h3>
<p id="TextElement">The text and tspan elements.</p>
<div class="element-summary"><div class="element-summary-name"><dfn id="elementdef-text">text</dfn></div><dl><dt>Categories:</dt><dd>Text content element</dd></dl></div>
<div class="element-summary"><div class="element-summary-name"><dfn id="elementdef-tspan">tspan</dfn></div><dl><dt>Categories:</dt><dd>Text content child element</dd></dl></div>
</body>`);
		const a = extractSection(page, 'AElement');
		const text = extractSection(page, 'TextElement');
		expect(a.status === 'found' && a.unit).toContain('Container element');
		expect(text.status === 'found' && text.unit).toContain('Text content element');
		expect(text.status === 'found' && text.unit).not.toContain('Text content child element');
	});
});
