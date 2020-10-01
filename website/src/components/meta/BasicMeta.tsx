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
			<meta name="theme-color" content="#fff" />
			<meta property="og:type" content="website" />
			<meta property="og:title" content={title} />
			<meta
				property="og:description"
				content={description ? description : 'Peace of mind in your markup. A Linter for All Markup Languages.'}
			/>
			<meta
				property="og:image"
				content="https://repository-images.githubusercontent.com/104835801/27437480-da03-11e9-8504-c8407b7d9a13"
			/>
			<meta name="twitter:card" content="summary" />
			<meta name="twitter:site" content="@markuplint" />
			<meta name="twitter:title" content={title} />
			<meta
				name="twitter:description"
				content={description ? description : 'Peace of mind in your markup. A Linter for All Markup Languages.'}
			/>
			<meta
				name="twitter:image"
				content="https://repository-images.githubusercontent.com/104835801/27437480-da03-11e9-8504-c8407b7d9a13"
			/>
		</Head>
	);
}
