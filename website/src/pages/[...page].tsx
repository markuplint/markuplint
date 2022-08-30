import type { PromiseType } from 'utility-types';

import { MDXRemote } from 'next-mdx-remote';
import { memo } from 'react';

import MDXElement from '../components/MDXElement';
import Layout from '../layouts';
import { getAllPostIds, getPostData } from '../lib/pages';

type Props = PromiseType<ReturnType<typeof getPostData>>;

const Page = memo<Props>(({ content }) => {
  if (!content) {
    return null;
  }
  return (
    <Layout
      meta={{
        title: content.frontmatter?.title || 'Not Found',
        // @ts-ignore
        back: content.frontmatter?.back,
        // @ts-ignore
        next: content.frontmatter?.next,
      }}
    >
      <MDXRemote {...content} components={MDXElement} />
    </Layout>
  );
});

export function getStaticPaths() {
  const paths = getAllPostIds();
  return {
    paths,
    fallback: true,
  };
}

export async function getStaticProps({ params, locale, defaultLocale }) {
  const filePath: string[] = params.page;
  const data = await getPostData(filePath, locale, defaultLocale);
  return {
    props: data,
  };
}

export default Page;
