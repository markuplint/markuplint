import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import matter from 'gray-matter';

const { editUrlBase } = (await import('./config.js')).default;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '../');

const RULES_DIR = 'packages/@markuplint/rules/src';
const rulesAbsDir = resolve(projectRoot, RULES_DIR);

async function getRulePaths() {
  const rulesDirFileList = await readdir(pathToFileURL(rulesAbsDir));
  const dirs = (
    await Promise.all(
      rulesDirFileList.map(async name => {
        const path = resolve(rulesAbsDir, name);
        const meta = await stat(path);
        if (!meta.isDirectory()) {
          return;
        }
        const content = await readdir(path);
        return content.includes('schema.json') && path;
      }),
    )
  ).filter(_ => _);
  return dirs;
}

function type(value, escape = false) {
  const verticalBar = escape ? '&#x7C;' : '|';

  if (value.oneOf) {
    return value.oneOf.map(v => type(v, escape)).join(verticalBar);
  }

  if (value.type === 'array') {
    return type(value.items, escape) + '[]';
  }

  if (value.type === 'string' && value.enum) {
    return value.enum.map(e => `"${e}"`).join(verticalBar);
  }

  if (value.type === 'object' && value._type) {
    return value._type;
  }

  return value.type;
}

function valueDoc(value) {
  if (value.enum && value._description) {
    const table = [
      //
      'Value|Default|Description',
      '---|---|---',
    ];

    table.push(
      ...value.enum.map(e => {
        const desc = value._description[e];
        return `\`"${e}"\`|${value.default === e ? '✓' : ''}|${desc}`;
      }),
    );

    return table;
  }

  if (value.description) {
    return [value.description];
  }

  return [];
}

function optionDoc(name, option) {
  if (!option) {
    return [];
  }

  const props = Object.entries(option.properties).map(([k, v]) => {
    return `"${k}"?: ${type(v)}`;
  });

  const table = Object.entries(option.properties).map(([k, v]) => {
    return `\`${k}\`|<code>${type(v, true)}</code>|\`${v.default}\`|${v.description}`;
  });

  return [
    //
    '### Options',
    '```ts',
    '{',
    `  "${name}": {`,
    '    "option": {',
    ...props.map(prop => `      ${prop}`),
    '    }',
    '  }',
    '}',
    '```',
    'Property|Type|Default Value|Description',
    '---|---|---|---',
    ...table,
  ];
}

async function createRuleDoc(path, value, option) {
  const name = basename(path);
  const docPath = resolve(path, 'README.md');
  const doc = await readFile(docPath, { encoding: 'utf-8' });

  const { data: frontMatter, content } = matter(doc);

  // NOTE: `glob` returns `/` separated paths, even on Windows.
  frontMatter.custom_edit_url = `${editUrlBase}/${RULES_DIR}/${name}/README.md`;
  let rewrote = matter.stringify(content.replace(/\(https:\/\/markuplint\.dev\//g, '(/'), frontMatter);

  const separator = /\n\n---\n\n/m;
  const target = rewrote.search(separator) === -1 ? /$/ : separator;

  rewrote = rewrote.replace(
    target,
    [
      '\n\n',
      '## Interface',
      '```ts',
      '{',
      `  "${name}": ${type(value)}`,
      '}',
      '```',
      ...valueDoc(value),
      ...optionDoc(name, option),
      '## Default Severity',
      `\`${frontMatter.severity}\``,
      '\n',
    ].join('\n'),
  );

  return {
    id: frontMatter.id,
    description: frontMatter.description,
    contents: rewrote,
    category: frontMatter.category,
  };
}

async function createRuleDocs() {
  const paths = await getRulePaths();

  const index = {
    validation: [],
    a11y: [],
    'naming-convention': [],
    maintainability: [],
    style: [],
  };

  for (const path of paths) {
    const { default: schema } = await import(pathToFileURL(resolve(path, 'schema.json')), { assert: { type: 'json' } });
    const { value, option } = schema.definitions;

    const { id, description, contents, category } = await createRuleDoc(path, value, option);

    // TODO: Japanese Page
    // const jaDist = resolve(__dirname, `./i18n/${locale}/docusaurus-plugin-content-docs/current/rules`, `${ruleName}.md`);

    if (index[category]) {
      index[category].push({ id, description });
    }

    const dist = resolve(__dirname, './docs/rules', `${id}.md`);
    await writeFile(dist, contents, { encoding: 'utf-8' });
  }

  const ruleListItem = rule => `[\`${rule.id}\`](/rules/${rule.id})|${rule.description}`;

  const table = list => {
    return ['Rule ID|Description', '---|---', ...list.map(ruleListItem)];
  };

  const indexDoc = [
    '---',
    'title: Rules',
    '---',
    //
    '## Conformance checking',
    ...table(index.validation),
    '## Accessibility',
    ...table(index.a11y),
    '## Naming Convention',
    ...table(index['naming-convention']),
    '## Maintainability',
    ...table(index.maintainability),
    '## Style',
    ...table(index.style),
  ].join('\n');

  await writeFile(resolve(__dirname, './docs/rules/index.md'), indexDoc, { encoding: 'utf-8' });
}

await createRuleDocs();
