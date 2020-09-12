import BasicMeta from '../components/meta/BasicMeta';
import Layout from '../components/Layout';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

type Props = {
	title: string;
	back?: {
		title: string;
		href: string;
	};
	next?: {
		title: string;
		href: string;
	};
};
export default function Index({ title, back, next }: Props) {
	return ({ children }: PropsWithChildren<{}>) => {
		return (
			<Layout>
				<BasicMeta url="/" title={title} />
				<h1>{title}</h1>
				<div>{children}</div>
				{(back || next) && (
					<nav className="step-nav" aria-label="Step">
						{back && (
							<div className="step-nav-back">
								<Link href={`./${back.href}/`}>
									<a href={`./${back.href}/`}>
										<span>Back:</span>
										<span>{back.title}</span>
									</a>
								</Link>
							</div>
						)}
						{next && (
							<div className="step-nav-next">
								<Link href={`./${next.href}/`}>
									<a href={`./${next.href}/`}>
										<span>Next:</span>
										<span>{next.title}</span>
									</a>
								</Link>
							</div>
						)}
					</nav>
				)}
				<style jsx>
					{`
						.step-nav {
							display: flex;
							justify-content: space-between;
							margin: 2em 0 0;
						}

						.step-nav-back {
							display: flex;
							flex: 1 0 auto;
						}

						.step-nav-next {
							display: flex;
							flex: 1 0 auto;
							justify-content: flex-end;
						}

						.step-nav a {
							display: block;
							padding: 0.5em 1em;
							background: var(--base-color-front);
							box-shadow: 0 1px 2px 0 var(--shadow);
							color: inherit;
							text-decoration: none;
							border-radius: 3px;
						}

						.step-nav a span:first-child {
							opacity: 0.8;
							margin: 0 0.3em 0 0;
						}

						.step-nav a span:last-child {
							font-weight: 700;
						}
					`}
				</style>
			</Layout>
		);
	};
}
