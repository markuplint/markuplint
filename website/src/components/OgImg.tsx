import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React from 'react';

import { getOgImgUrl } from '../utils/getOgImgUrl';

type Props = {
  title: string;
  category?: string;
};

/**
 * @pretends null
 */
export default function OgImg({ title, category }: Props) {
  const { i18n } = useDocusaurusContext();
  const image = getOgImgUrl(category, title, i18n.currentLocale);

  return (
    <Head>
      <meta property="og:image" content={image} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
