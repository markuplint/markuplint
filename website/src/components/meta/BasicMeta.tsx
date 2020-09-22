import Head from 'next/head';

const siteTitle = 'markuplint';

type Props = {
	title?: string;
	description?: string;
};
export default function BasicMeta({ title, description }: Props) {
	return (
		<Head>
			<meta charSet="utf-8" />
			<title>{title ? [title, siteTitle].join(' | ') : siteTitle}</title>
			<meta name="description" content={description ? description : ''} />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="apple-touch-icon" href="/icon.png" />
			<meta name="theme-color" content="#fff" />
			<meta name="twitter:card" content="summary" />
			<meta name="twitter:site" content="@markuplint" />
			<meta
				property="og:image"
				content="https://repository-images.githubusercontent.com/104835801/27437480-da03-11e9-8504-c8407b7d9a13"
			/>
		</Head>
	);
}
