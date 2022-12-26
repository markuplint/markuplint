import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

import matter from 'gray-matter';

import { rewriteRuleContent } from './rule-content.mjs';
import { dropFiles, getEditUrlBase, glob, importJSON, output, projectRoot } from './utils.mjs';

/** @typedef {Record<"validation"|"a11y"|"naming-convention"|"maintainability"|"style", string[]>} RuleIndexContents */
/** @typedef {{ lang: string, contents: RuleIndexContents }} RuleIndex */
/** @typedef {{ lang: string,id: string, description: string, category: string, severity: string, contents: string }} DocData */

const RULES_DIR = 'packages/@markuplint/rules/src';

/**
 * Get directories of rules
 *
 * @returns {Promise<string[]>}
 */
async function getRulePaths() {
  const rulesAbsDir = resolve(projectRoot, RULES_DIR);
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

/**
 *
 * @param {string} filePath
 * @param {Value} value
 * @param {Options} options
 * @param {Partial<DocData>} [inherit]
 * @returns {Promise<Partial<DocData>>}
 */
async function getDocFile(filePath, value, options, inherit) {
  const editUrlBase = await getEditUrlBase();
  const name = basename(filePath);
  const doc = await readFile(filePath, { encoding: 'utf-8' });
  const { data: frontMatter, content } = matter(doc);
  frontMatter.custom_edit_url = `${editUrlBase}/${RULES_DIR}/${name}`;

  const fileName = basename(filePath, extname(filePath));
  const lang = (/^README(?:\.([a-z]+))?$/.exec(fileName) || [])[1];

  const id = frontMatter.id ?? inherit?.id;
  const severity = frontMatter.severity ?? inherit?.severity;

  let rewrote = rewriteRuleContent(content, id, value, options, severity, lang);

  // eslint-disable-next-line import/no-named-as-default-member
  rewrote = matter.stringify(rewrote, frontMatter);

  return {
    ...inherit,
    ...JSON.parse(
      JSON.stringify({
        lang,
        id: frontMatter.id,
        description: frontMatter.description,
        category: frontMatter.category,
        severity: frontMatter.severity,
        contents: rewrote,
      }),
    ),
  };
}

/**
 *
 * @param {string} path
 * @returns
 */
async function createRuleDoc(path) {
  const schema = await importJSON(resolve(path, 'schema.json'));
  const { value, options } = schema.definitions;
  const docFile = resolve(path, 'README.md');
  const doc = await getDocFile(docFile, value, options);
  const i18nDocFiles = await glob(resolve(path, 'README.*.md'));
  const i18nDocs = await Promise.all(i18nDocFiles.map(docPath => getDocFile(docPath, value, options, doc)));

  return [doc, ...i18nDocs];
}

/**
 * Create empty index
 *
 * @returns {RuleIndexContents}
 */
function createIndexContents() {
  return {
    validation: [],
    a11y: [],
    'naming-convention': [],
    maintainability: [],
    style: [],
  };
}

/**
 * Create rule page
 *
 * @param {string} paths
 * @param {string} ruleDocsDistDir
 * @param {string} ruleDocsI18nDistDir
 * @return {Promise<RuleIndex[]>}
 */
async function createEachRule(paths, ruleDocsDistDir, ruleDocsI18nDistDir) {
  /**
   * @type RuleIndex[]
   */
  const indexes = [];

  for (const path of paths) {
    const docs = await createRuleDoc(path);

    for (const doc of docs) {
      /**
       * @type RuleIndex
       */
      const index = indexes.find(idx => idx.lang === doc.lang) ?? {
        lang: doc.lang,
        contents: createIndexContents(),
      };

      index.contents[doc.category].push({
        id: doc.id,
        description: doc.description,
      });

      if (!indexes.find(idx => idx.lang === doc.lang)) {
        indexes.push(index);
      }

      const dist = !doc.lang
        ? // lang: en
          resolve(ruleDocsDistDir, `${doc.id}.md`)
        : // lang: except en
          resolve(ruleDocsI18nDistDir.replace('<lang>', doc.lang), `${doc.id}.md`);

      await output(dist, doc.contents);
    }
  }

  return indexes;
}

/**
 * Create rule index page
 *
 * @param {RuleIndex} index
 * @param {string} ruleDocsDistDir
 */
async function crateRuleIndexDoc(index, ruleDocsDistDir) {
  const ruleListItem = rule =>
    !rule.href
      ? `[\`${rule.id}\`](/docs/rules/${rule.id})|${rule.description}`
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

  await output(resolve(ruleDocsDistDir, 'index.md'), indexDoc);
}

/**
 * Create rule pages
 *
 * @param {string} projectRoot
 */
export async function createRuleDocs() {
  const websiteDir = resolve(projectRoot, 'website');
  const ruleDocsDistDir = resolve(websiteDir, 'docs', 'rules');
  const ruleDocsI18nDistDir = resolve(
    websiteDir,
    'i18n',
    '<lang>',
    'docusaurus-plugin-content-docs',
    'current',
    'rules',
  );
  const paths = await getRulePaths();

  await dropFiles(ruleDocsDistDir);
  await dropFiles(ruleDocsI18nDistDir, '<lang>');

  const indexes = await createEachRule(paths, ruleDocsDistDir, ruleDocsI18nDistDir);

  for (const index of indexes) {
    await crateRuleIndexDoc(
      index.contents,
      index.lang ? ruleDocsI18nDistDir.replace('<lang>', index.lang) : ruleDocsDistDir,
    );
  }
}
