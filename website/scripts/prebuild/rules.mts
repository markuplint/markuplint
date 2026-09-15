import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, basename, extname, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import matter from 'gray-matter';

import { rewriteRuleContent } from './rule-content.mjs';
import { dropFiles, getEditUrlBase, glob, importFileData, output, projectRoot } from './utils.mjs';

type RuleIndexContents = Readonly<
  Record<
    | 'syntax'
    | 'structure'
    | 'attributes'
    | 'references'
    | 'forms'
    | 'a11y'
    | 'style'
    | 'maintainability'
    | 'compat',
    readonly string[]
  >
>;
type RuleIndex = Readonly<{ lang: string; contents: RuleIndexContents }>;
type DocData = {
  lang: string;
  id: string;
  description: string;
  category: string;
  severity: string;
  fixable: boolean;
  contents: string;
};

const RULES_DIR = 'packages/@markuplint/rules/src';

/**
 * Get directories of rules
 */
async function getRulePaths(): Promise<string[]> {
  const rulesAbsDir = resolve(projectRoot, RULES_DIR);
  const rulesDirFileList = await readdir(pathToFileURL(rulesAbsDir));
  const dirs = await Promise.all(
    rulesDirFileList.map(async name => {
      const path = resolve(rulesAbsDir, name);
      const meta = await stat(path);
      if (!meta.isDirectory()) {
        return;
      }
      const content = await readdir(path);
      return content.includes('schema.json') && path;
    }),
  );
  return dirs.filter(Boolean) as string[];
}

async function getDocFile(
  filePath: string,
  value: any,
  options: any,
  severity: 'error' | 'warning',
  fixable: boolean,
  inherit?: Partial<Readonly<DocData>>,
): Promise<Partial<DocData>> {
  const editUrlBase = await getEditUrlBase();
  const fileBase = basename(filePath);
  const rulesAbsDir = resolve(projectRoot, RULES_DIR);
  const ruleName = dirname(relative(rulesAbsDir, filePath));
  const doc = await readFile(filePath, { encoding: 'utf8' });
  const { data: frontMatter, content } = matter(doc);
  frontMatter.custom_edit_url = `${editUrlBase}/${RULES_DIR}/${ruleName}/${fileBase}`;

  const fileName = basename(filePath, extname(filePath));
  const lang = (/^README(?:\.([a-z]+))?$/.exec(fileName) ?? [])[1];

  const id = frontMatter.id ?? inherit?.id;

  let rewrote = rewriteRuleContent(content, id, value, options, severity ?? inherit?.severity, lang, fixable);

  // eslint-disable-next-line import/no-named-as-default-member
  rewrote = matter.stringify(rewrote, frontMatter);

  return {
    ...inherit,
    ...JSON.parse(
      JSON.stringify({
        lang,
        id: frontMatter.id,
        description: frontMatter.description,
        contents: rewrote,
      }),
    ),
  };
}

async function createRuleDoc(path: string) {
  const schema = await importFileData(resolve(path, 'schema.json'));
  const meta = await importFileData(resolve(path, 'meta.js'));
  const { value, options } = schema.definitions;
  const category = meta.category;
  const fixable = meta.fixable === true;
  const severity = schema.oneOf.find((val: any) => val.properties)?.properties?.severity?.default ?? 'N/A';
  const docFile = resolve(path, 'README.md');
  const doc = await getDocFile(docFile, value, options, severity, fixable);
  doc.category = category;
  doc.severity = severity;
  doc.fixable = fixable;
  const i18nDocFiles = await glob(resolve(path, 'README.*.md'));
  const i18nDocs = await Promise.all(i18nDocFiles.map(docPath => getDocFile(docPath, value, options, severity, fixable, doc)));

  return [doc, ...i18nDocs];
}

/**
 * Create empty index
 */
function createIndexContents(): RuleIndexContents {
  return {
    syntax: [],
    structure: [],
    attributes: [],
    references: [],
    forms: [],
    a11y: [],
    style: [],
    maintainability: [],
    compat: [],
  };
}

/**
 * Create rule page
 */
async function createEachRule(
  paths: readonly string[],
  ruleDocsDistDir: string,
  ruleDocsI18nDistDir: string,
): Promise<RuleIndex[]> {
  const indexes: RuleIndex[] = [];

  for (const path of paths) {
    const docs = await createRuleDoc(path);

    for (const doc of docs) {
      const index: RuleIndex = indexes.find(idx => idx.lang === doc.lang) ?? {
        lang: doc.lang!,
        contents: createIndexContents(),
      };

      // @ts-expect-error
      index.contents[doc.category].push({
        id: doc.id,
        description: doc.description,
        fixable: doc.fixable,
      });

      if (!indexes.some(idx => idx.lang === doc.lang)) {
        indexes.push(index);
      }

      const dist = doc.lang
        ? // lang: except en
          resolve(ruleDocsI18nDistDir.replace('<lang>', doc.lang), `${doc.id}.md`)
        : // lang: en
          resolve(ruleDocsDistDir, `${doc.id}.md`);

      await output(dist, doc.contents!);
    }
  }

  return indexes;
}

/**
 * Create rule index page
 */
async function crateRuleIndexDoc(index: RuleIndexContents, ruleDocsDistDir: string) {
  const ruleListItem = (rule: any) =>
    rule.href
      ? `[\`${rule.id}\`](${rule.href})|${rule.fixable ? '🔧' : ''}|${rule.description}`
      : `[\`${rule.id}\`](/docs/rules/${rule.id})|${rule.fixable ? '🔧' : ''}|${rule.description}`;

  const table = (list: readonly any[]) => {
    return ['Rule ID|Fixable|Description', '---|:---:|---', ...list.map(ruleListItem)];
  };

  const removedTable = (list: readonly any[], drop: string) => {
    return [
      'Rule ID|Fixable|Description|Drop',
      '---|:---:|---|---',
      ...list.map(ruleListItem).map((line: string) => `${line}|Since \`${drop}\``),
    ];
  };

  const indexDoc = [
    '---',
    'title: Rules',
    'sidebar_class_name: hidden',
    '---',
    //
    'The complete list of built-in rules. Most users don\'t need to configure these individually — [presets](/docs/guides/presets) enable them for you. See [Applying Rules](/docs/guides/applying-rules) to customize.',
    '',
    '## Syntax',
    ...table(index.syntax),
    '## Structure',
    ...table(index.structure),
    '## Attributes',
    ...table(index.attributes),
    '## References',
    ...table(index.references),
    '## Forms',
    ...table(index.forms),
    '## Accessibility',
    ...table(index.a11y),
    '## Style',
    ...table(index.style),
    '## Maintainability',
    ...table(index.maintainability),
    '## Browser Compatibility',
    ...table(index.compat),
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
