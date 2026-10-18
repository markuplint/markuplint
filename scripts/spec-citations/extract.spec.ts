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
