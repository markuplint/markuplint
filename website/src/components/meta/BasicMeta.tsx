import Head from 'next/head';

const siteTitle = 'markuplint';

type Props = {
	title?: string;
	description?: string;
	author?: string;
	url: string;
};
export default function BasicMeta({ title, description, author, url }: Props) {
	return (
		<Head>
			<title>{title ? [title, siteTitle].join(' | ') : siteTitle}</title>
			<meta name="description" content={description ? description : ''} />
			{author ? <meta name="author" content={author} /> : null}
			{/* <link rel="canonical" href={config.base_url + url} /> */}
		</Head>
	);
}
