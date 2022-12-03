import { useDoc } from '@docusaurus/theme-common/internal';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import MDXContent from '@theme-original/MDXContent';
import Admonition from '@theme/Admonition';
import React from 'react';

export default function MDXContentWrapper(props) {
  const {
    metadata: { source },
  } = useDoc();
  const { i18n } = useDocusaurusContext();

  return (
    <>
      {i18n.currentLocale === 'ja' && !source.startsWith('@site/i18n') && (
        <Admonition type="caution">このページはまだ翻訳が用意されていないため、英語版を表示しています。</Admonition>
      )}
      <MDXContent {...props} />
    </>
  );
}
