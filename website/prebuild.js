/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const util = require('util');

const glob = require('glob');
/* eslint-enable @typescript-eslint/no-var-requires */

const asyncGlob = util.promisify(glob);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const ruleDir = path.resolve(process.cwd(), '../packages/@markuplint/rules/src/');
const globPath = path.resolve(ruleDir, '**/README{,.ja}.md');
const distDir = path.resolve(__dirname, './src/pages/rules');

async function copy() {
  const rulesMdList = await asyncGlob(globPath);

  await Promise.all(
    rulesMdList.map(async md => {
      const dirname = path.basename(path.dirname(md));
      const dist = path.resolve(distDir, `${dirname}${md.endsWith('.ja.md') ? '.ja' : ''}.mdx`);
      const content = await readFile(md, { encoding: 'utf-8' });
      const rewrote = content.replace(/\(https:\/\/markuplint\.dev\//g, '(/');
      await writeFile(dist, rewrote, { encoding: 'utf-8' });
    }),
  );
}

// Main
(async () => {
  await copy();
})();
