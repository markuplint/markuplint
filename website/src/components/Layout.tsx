import Footer from './Footer';
import Head from 'next/head';
import Header from './Header';
import { PropsWithChildren } from 'react';

type Props = {};
export default function Layout({ children }: PropsWithChildren<Props>) {
	return (
		<>
			<Head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="manifest" href="/site.webmanifest" />
				<link rel="apple-touch-icon" href="/icon.png" />
				<meta name="theme-color" content="#fff" />
			</Head>
			<Header />
			<main>{children}</main>
			<Footer />
			<style jsx>
				{`
					main {
						max-width: 580px;
						margin: 3em auto 5em;
						padding: 0 20px;
						position: relative;
						z-index: 0;
					}
				`}
			</style>
		</>
	);
}
