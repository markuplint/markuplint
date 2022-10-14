import fs from 'fs';
import path from 'path';

import rehypePrism from '@mapbox/rehype-prism';
import { sync } from 'glob';
import { serialize } from 'next-mdx-remote/serialize';
import remarkComment from 'remark-comment';
import remarkGfm from 'remark-gfm';

const pagesDirectory = path.resolve(__dirname, '..', '..', '..', 'src', 'pages');

export function getAllPostIds() {
  const candidated = path.resolve(pagesDirectory, '**', '*.{md,mdx}');
  const filePaths = sync(candidated);
  const fileNames = filePaths.map(filePath => path.relative(pagesDirectory, filePath));
  return fileNames.map(fileName => {
    return {
      params: {
        page: fileName.replace(/\.mdx?$/, '').split('/'),
      },
    };
  });
}

export async function getPostData(paths: string[], locale: string, defaultLocale: string) {
  const candidatedLocaleFile = path.resolve(pagesDirectory, `${paths.join(path.sep)}.${locale}.{md,mdx}`);
  const candidatedFile = path.resolve(pagesDirectory, `${paths.join(path.sep)}.{md,mdx}`);
  const candidatedDir = path.resolve(pagesDirectory, ...paths, 'index.{md,mdx}');
  const fullPath = sync(candidatedLocaleFile)[0] || sync(candidatedFile)[0] || sync(candidatedDir)[0];
  if (!fullPath) {
    throw new Error('404');
  }
  const mdx = fs.readFileSync(fullPath, { encoding: 'utf-8' });
  const mdxSource = await serialize(mdx, {
    mdxOptions: {
      remarkPlugins: [remarkComment, remarkGfm],
      rehypePlugins: [rehypePrism],
    },
    parseFrontmatter: true,
  });
  return {
    content: mdxSource,
  };
}
