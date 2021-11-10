import type { PropsWithChildren } from 'react';

import Footer from './Footer';
import Header from './Header';

type Props = {};
export default function Layout({ children }: PropsWithChildren<Props>) {
	return (
		<>
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
