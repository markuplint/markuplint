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
                  マークアップは、有効なコードを記述する必要があります。これは、各ユーザーエージェントを介してウェブページを壊さないという標準の約束を守るために重要なことです。Markuplintは、HTML
                  StandardやWAI-ARIAなどの仕様を踏まえた上で、適合性チェックを行うことができます。
                </>
              ),
            },
            {
              title: 'ハウスルールに利用する',
              symbol: '🛡',
              description: (
                <>
                  プロジェクトや組織でハウスルールがある場合があります。方針や管理手法に基づいてチェックすることができます。設定次第で、アプリケーションをよりアクセシブルで、より安全で、より高いパフォーマンスを得ることができ、高い品質を得ることができます。
                </>
              ),
            },
            {
              title: 'デザインシステムに利用する',
              symbol: '📐',
              description: (
                <>
                  Markuplintは、プロジェクトのデザインシステムで作られたコンポーネントが正しく使われているかどうかをチェックすることができます。属性やプロパティ、要素の親子関係などをチェックします。今以上に堅牢なデザインシステムになるでしょう。
                </>
              ),
            },
            {
              title: 'セレクタごとに適用する',
              symbol: '🆔',
              description: (
                <>
                  状況によっては、ある要素に部分的に適用したいこともあるでしょう。あるいは一部を除外したい。Markuplintには、CSSセレクタや正規表現セレクタなどで部分的に選択をして適用する機能があります。
                </>
              ),
            },
            {
              title: 'テンプレートエンジンのサポート',
              symbol: '📝',
              description: (
                <>
                  Markuplintは、プラグインを通じてHTML以外の構文やテンプレートエンジンについても評価することができます。Pug,
                  JSX(React), Vue, Svelte, Astro, Alpine.js, HTMX, PHP, Smarty, eRuby, EJS, Mustache/Handlebars,
                  Nunjucks,
                  Liquid用のプラグインが用意されています。また、欲しい構文に対応したプラグインを作成するAPIも提供します。
                </>
              ),
            },
            {
              title: 'エディタ拡張機能',
              symbol: '🧩',
              description: (
                <>
                  Visual Studio
                  CodeのMarkuplint拡張があります。入力時に問題を検出することは大切です。なぜなら、CLIよりも簡単かつ迅速に問題を認識することができるからです。そして、それは初心者のHTMLコーディングのトレーニングにも役立ちます。
                </>
              ),
            },
          ]}
        />
      </main>
    </Layout>
  );
}
