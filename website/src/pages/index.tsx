import BasicMeta from '../components/meta/BasicMeta';
import Layout from '../components/Layout';

export default function Index() {
	return (
		<Layout isHome>
			<BasicMeta url={'/'} />
			<div>
				<h1>markuplint</h1>
				<h2>Peace of mind in your markup</h2>
			</div>
			<style jsx>{`
				* {
					color: inherit;
				}
			`}</style>
		</Layout>
	);
}
