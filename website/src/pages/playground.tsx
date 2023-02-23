import Layout from '@theme/Layout';
import React from 'react';
import Playground from '../playground';

export default function PlaygroundPage(): JSX.Element {
  return (
    <Layout title="Markuplint Playground" noFooter wrapperClassName="h-0">
      <Playground />
    </Layout>
  );
}
