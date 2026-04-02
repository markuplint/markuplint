import Hero from '@site/src/components/Hero';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Layout from '@theme/Layout';
import React from 'react';

export default function Home(): JSX.Element {
	return (
		<Layout
			title="Markuplint - すべてのマークアップ開発者のためのHTMLリンター"
			description="あなたのマークアップに安寧を。すべてのマークアップ開発者のためのHTMLリンター。"
		>
			<Hero
				tagLine="あなたのマークアップに安寧を"
				description="すべてのマークアップ開発者のためのHTMLリンター"
				getStarted="はじめる"
				rules="ルールを見る"
				faq="よくある質問を確認する"
			/>
			<main>
				<HomepageFeatures
					heading="主な機能"
					features={[
						{
							title: '適合性チェック',
							symbol: '🚨',
							description: (
								<>
									有効なマークアップは、信頼性の高いウェブの基盤です。MarkuplintはHTML
									Standard、WAI-ARIAなどの仕様に照らしてHTMLをチェックし、ブラウザは黙って無視するが支援技術や検索エンジンが見逃さないエラーを検出します。
								</>
							),
						},
						{
							title: 'ハウスルールに利用する',
							symbol: '🛡',
							description: (
								<>
									仕様が求める以上のコーディング規約をプロジェクトに適用できます。アクセシビリティ、セキュリティ、パフォーマンス、命名規則のルールを設定し、チームの合意を機械的に検証可能にします。
								</>
							),
						},
						{
							title: 'デザインシステムに利用する',
							symbol: '📐',
							description: (
								<>
									デザインシステム内のコンポーネントが正しく使われているかを検証します。要素の属性、プロパティ、親子関係をチェックし、コンポーネントの契約を守ります。
								</>
							),
						},
						{
							title: 'セレクタごとに適用する',
							symbol: '🆔',
							description: (
								<>
									CSSセレクタ、拡張擬似クラス、正規表現を使って特定の要素にルールを適用できます。あるセクションでは厳格なルールを適用し、別のセクションでは緩和する
									— きめ細かな制御が可能です。
								</>
							),
						},
						{
							title: 'HTML以外にも対応',
							symbol: '📝',
							description: (
								<>
									JSX（React）、Vue、Svelte、Astro、Alpine.js、HTMX、Pug、PHP、Smarty、eRuby、EJS、Mustache/Handlebars、Nunjucks、Liquid、Markdown、MDX、タグ付きテンプレートリテラル（lit-html）に公式パーサープラグインで対応しています。
								</>
							),
						},
						{
							title: 'VS Code拡張',
							symbol: '🧩',
							description: (
								<>
									Visual Studio
									CodeのMarkuplint拡張で、入力中にリアルタイムでフィードバックを受けられます。プロジェクトへのセットアップは不要
									— 拡張をインストールしてHTMLファイルを開くだけで、すぐにリントが始まります。
								</>
							),
						},
					]}
				/>
			</main>
		</Layout>
	);
}
