import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import matter from 'gray-matter';

import { dropFiles } from './utils.mjs';

/** @typedef {Record<"validation"|"a11y"|"naming-convention"|"maintainability"|"style", string[]>} RuleIndex */

const RULES_DIR = 'packages/@markuplint/rules/src';

/**
 *
 * @param {string} projectRoot
 * @returns {string}
 */
const getRulesAbsDir = projectRoot => resolve(projectRoot, RULES_DIR);

/**
 *
 * @param {string} projectRoot
 * @returns {Promise<string>}
 */
const getEditUrlBase = async projectRoot =>
  (await import(resolve(projectRoot, 'website', 'config.js'))).default.editUrlBase;

/**
 *
 * @param {string} projectRoot
 * @returns {Promise<string[]>}
 */
async function getRulePaths(projectRoot) {
  const rulesAbsDir = getRulesAbsDir(projectRoot);
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

/**
 *
 * @param {string} path
 * @param {string} editUrlBase
 * @returns
 */
async function createRuleDoc(path, editUrlBase) {
  const { default: schema } = await import(pathToFileURL(resolve(path, 'schema.json')), { assert: { type: 'json' } });
  const { value, option } = schema.definitions;
  const name = basename(path);
  const docPath = resolve(path, 'README.md');
  const doc = await readFile(docPath, { encoding: 'utf-8' });

  const { data: frontMatter, content } = matter(doc);

  frontMatter.custom_edit_url = `${editUrlBase}/${RULES_DIR}/${name}/README.md`;
  // eslint-disable-next-line import/no-named-as-default-member
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

  // Replace Paths
  rewrote = rewrote.replaceAll('](../', '](./');

  return {
    id: frontMatter.id,
    description: frontMatter.description,
    contents: rewrote,
    category: frontMatter.category,
  };
}

/**
 * Create rule page
 *
 * @param {string} paths
 * @param {string} ruleDocsDistDir
 * @param {string} editUrlBase
 * @return {Promise<RuleIndex>}
 */
async function createEachRule(paths, ruleDocsDistDir, editUrlBase) {
  /**
   * @type RuleIndex
   */
  const index = {
    validation: [],
    a11y: [],
    'naming-convention': [],
    maintainability: [],
    style: [],
  };

  for (const path of paths) {
    const { id, description, contents, category } = await createRuleDoc(path, editUrlBase);

    // TODO: Japanese Page
    // const jaDist = resolve(__dirname, `./i18n/${locale}/docusaurus-plugin-content-docs/current/rules`, `${ruleName}.md`);

    if (index[category]) {
      index[category].push({ id, description });
    }

    const dist = resolve(ruleDocsDistDir, `${id}.md`);
    await writeFile(dist, contents, { encoding: 'utf-8' });
  }

  return index;
}

/**
 * Create rule index page
 *
 * @param {RuleIndex} index
 * @param {string} websiteDir
 */
async function crateRuleIndexDoc(index, websiteDir) {
  const ruleListItem = rule =>
    !rule.href
      ? `[\`${rule.id}\`](/rules/${rule.id})|${rule.description}`
      : `[\`${rule.id}\`](${rule.href})|${rule.description}`;

  const table = list => {
    return ['Rule ID|Description', '---|---', ...list.map(ruleListItem)];
  };

  const removedTable = (list, drop) => {
    return [
      'Rule ID|Description|Drop',
      '---|---|---',
      ...list.map(ruleListItem).map(line => `${line}|Since \`${drop}\``),
    ];
  };

  const indexDoc = [
    '---',
    'title: Rules',
    'sidebar_class_name: hidden',
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
    '---',
    '## Removed rules',
    ...removedTable(
      [
        {
          id: 'attr-equal-space-after',
          href: 'https://v1.markuplint.dev/rules/attr-equal-space-after',
          description: 'Spaces after the equal of attribute',
        },
        {
          id: 'attr-equal-space-before',
          href: 'https://v1.markuplint.dev/rules/attr-equal-space-before',
          description: 'Spaces before the equal of attribute',
        },
        {
          id: 'attr-spacing',
          href: 'https://v1.markuplint.dev/rules/attr-spacing',
          description: 'Spaces between attributes',
        },
        {
          id: 'indentation',
          href: 'https://v1.markuplint.dev/rules/indentation',
          description: 'Indentation',
        },
      ],
      'v3.0',
    ),
  ].join('\n');

  await writeFile(resolve(websiteDir, './docs/rules/index.md'), indexDoc, { encoding: 'utf-8' });
}

/**
 * Create rule pages
 *
 * @param {string} projectRoot
 */
export async function createRuleDocs(projectRoot) {
  const websiteDir = resolve(projectRoot, 'website');
  const ruleDocsDistDir = resolve(websiteDir, 'docs', 'rules');
  const paths = await getRulePaths(projectRoot);
  const editUrlBase = await getEditUrlBase(projectRoot);

  await dropFiles(ruleDocsDistDir);

  const index = await createEachRule(paths, ruleDocsDistDir, editUrlBase);
  await crateRuleIndexDoc(index, websiteDir);
}
