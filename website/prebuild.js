/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const util = require('util');

const glob = require('glob');
const matter = require('gray-matter');

const { editUrlBase } = require('./config');
/* eslint-enable @typescript-eslint/no-var-requires */

const asyncGlob = util.promisify(glob);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const projectRoot = path.resolve(process.cwd(), '../');

async function copy() {
  const rulesMdList = await asyncGlob('packages/@markuplint/rules/src/**/README{,.ja}.md', { cwd: projectRoot });

  await Promise.all(
    rulesMdList.map(async pathFromRoot => {
      const ruleName = path.basename(path.dirname(pathFromRoot));
      const locale = pathFromRoot.endsWith('.ja.md') ? 'ja' : 'en';
      const dist =
        locale === 'en'
          ? path.resolve(__dirname, './docs/rules', `${ruleName}.md`)
          : path.resolve(__dirname, `./i18n/${locale}/docusaurus-plugin-content-docs/current/rules`, `${ruleName}.md`);
      const { data: frontMatter, content } = matter(
        await readFile(path.resolve(projectRoot, pathFromRoot), { encoding: 'utf-8' }),
      );
      // NOTE: `glob` returns `/` separated paths, even on Windows.
      frontMatter.custom_edit_url = `${editUrlBase}/${pathFromRoot}`;
      const rewrote = matter.stringify(content.replace(/\(https:\/\/markuplint\.dev\//g, '(/'), frontMatter);
      await writeFile(dist, rewrote, { encoding: 'utf-8' });
    }),
  );
}

// Main
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  await copy();
})();
