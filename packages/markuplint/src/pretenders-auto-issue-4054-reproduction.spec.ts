import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTestFile } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Issue #4054 as reported: the files and the configuration of the reproduction linked
 * from the issue are used as they are, including the
 * type annotations of the props and the whole `markuplint:recommended-react` preset.
 * The reproduction reported 5 errors and 2 warnings with `pretenders.auto: true`
 * and 0 problems with it turned off.
 */

const files = {
	'button.tsx': `type Props = {
  type?: 'button' | 'submit' | 'reset';
};

export function Button({type}: Props) {
  return (
    <button
      aria-label='Save'
      type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}
    >
      Save
    </button>
  );
}
`,
	'tab.tsx': `type Props = {
  selected: boolean;
};

export function Tab({selected}: Props) {
  return (
    <button
      type='button'
      role='tab'
      aria-label='Example'
      tabIndex={selected ? 0 : -1}
    >
      Example
    </button>
  );
}
`,
	'chip.tsx': `type Props = {
  interactive: boolean;
  label: string;
};

export function Chip({interactive, label}: Props) {
  if (interactive) {
    return <button type='button' aria-label='Notifications'>{label}</button>;
  }

  return <span>{label}</span>;
}
`,
	'picture.tsx': `export function Picture() {
  return (
    <picture>
      <img
        src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
        alt='Example'
      />
    </picture>
  );
}
`,
	'usage.tsx': `import {Button} from './button';
import {Chip} from './chip';
import {Picture} from './picture';
import {Tab} from './tab';

export function Example() {
  return (
    <div>
      <Button />
      <label>
        <input type='checkbox' aria-label='Notifications' />
        <Chip interactive={false} label='Notifications' />
      </label>
      <Picture />
      <div role='tablist' aria-label='Examples'>
        <Tab selected={true} />
      </div>
    </div>
  );
}
`,
};

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	extends: ['markuplint:recommended-react'],
};

describe('pretenders.auto: issue #4054, as reproduced', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4054-repro-'));
		for (const [name, code] of Object.entries(files)) {
			await writeFile(path.join(tmpDir, name), code);
		}
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(name: string, pretenders: boolean) {
		const { violations } = await mlTestFile(path.join(tmpDir, name), {
			...config,
			pretenders: { auto: pretenders },
		});
		return violations.map(v => `${v.severity} ${v.ruleId}: ${v.raw}`);
	}

	test('the usage has no problem with pretenders.auto turned off', async () => {
		expect(await lint('usage.tsx', false)).toStrictEqual([]);
	});

	test('the usage has no problem with pretenders.auto turned on', async () => {
		expect(await lint('usage.tsx', true)).toStrictEqual([]);
	});

	test('pretenders.auto is in effect: it makes Details a details element, which needs a summary', async () => {
		await writeFile(
			path.join(tmpDir, 'details.tsx'),
			`export function Details({children}) {\n  return <details>{children}</details>;\n}\n`,
		);
		await writeFile(
			path.join(tmpDir, 'empty-details.tsx'),
			`import {Details} from './details';\nexport function Empty() {\n  return <Details></Details>;\n}\n`,
		);
		expect(await lint('empty-details.tsx', true)).toContain('error permitted-contents: <Details>');
		expect(await lint('empty-details.tsx', false)).not.toContain('error permitted-contents: <Details>');
	});

	test('the preset is applied: an image without a text alternative is reported', async () => {
		await writeFile(path.join(tmpDir, 'bad.tsx'), `export function Bad() {\n  return <img src='a.png' />;\n}\n`);
		expect(await lint('bad.tsx', true)).toContain("error require-accessible-name: <img src='a.png' />");
	});
});
