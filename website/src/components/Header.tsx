import Link from 'next/link';
import Logo from './Logo';
import { memo } from 'react';

type Props = {
	isHome?: boolean;
};
export default memo(({ isHome = false }: Props) => {
	return (
		<>
			<header>
				{isHome ? (
					<div>
						<Logo />
					</div>
				) : (
					<h1>
						<Link href="/">
							<a href="/">
								<Logo />
							</a>
						</Link>
					</h1>
				)}
				<nav aria-label="main menu">
					<ul>
						<li>
							<Link href="/getting-started">
								<a href="/getting-started">Getting Started</a>
							</Link>
						</li>
						<li>
							<Link href="/rules">
								<a href="/rules">Rules</a>
							</Link>
						</li>
						<li>
							<Link href="/configuration">
								<a href="/configuration">Configuration</a>
							</Link>
						</li>
						<li>
							<Link href="/playground">
								<a href="/playground">Playground</a>
							</Link>
						</li>
						<li>
							<Link href="/api-docs">
								<a href="/api-docs">
									<abbr title="Application Programming Interface">API</abbr>
								</a>
							</Link>
						</li>
					</ul>
				</nav>
			</header>
			<style jsx>{`
				header {
					background: var(--base-color-front);
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-wrap: wrap;
					padding: 1em;
					box-shadow: 0 0 5px 0 var(--shadow);
					position: relative;
					z-index: 10;
				}

				h1 {
					margin: 0;
					padding: 0;
					font-size: inherit;
				}

				nav ul {
					margin: 0;
					padding: 0;
					display: flex;
					list-style: none;
				}

				nav li {
					margin: 0 0 0 1em;
					padding: 0;
					display: block;
				}

				a {
					display: block;
					color: inherit;
					text-decoration: none;
				}

				abbr {
					text-decoration: none;
				}
			`}</style>
		</>
	);
});
