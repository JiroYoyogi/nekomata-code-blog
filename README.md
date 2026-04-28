## 前提

下記インストール済みであること

- Node.js（動画では v24.15.0）
- AWSアカウント

## Notionデータベースを作成

### データベースを複製

- 下記にアクセスして「複製」
- 自分のNotionワークスペースに追加

https://second-plutonium-d8a.notion.site/34ed1056141180918c7aca46980dba9f?v=34ed1056141180708545000ca5986863

（複製が出来ない場合）

- リポジトリをZIPダウンロード
- notion/NEKOMATA_CODE_BLOG.csvをインポート（一覧作成）
- 上記リンク先から各ページのマークダウンをコピペ

### Notion APIを使う設定

#### 開発者ポータルへ移動

「設定」→ 機能「コネクト」→「コネクトを開発または管理する」

#### インテグレーションを作成

構築する「内部インテグレーション」→「新しいインテグレーションを作成」

- インテグレーション名： `nekomata-code`
- Installed in： データベースを複製したワークスペースを選択

#### インテグレーションを編集

- 機能「コンテンツ機能」

```
「コンテンツを読み取る」のみチェック
```

- 「コンテンツへのアクセス」タブ

```
1. 「アクセス権限を編集」
2. 「NEKOMATA CODE BLOG」を選択して「保存する」
```

- アクセストークンをメモ

```
表示してコピーして、何処かメモをしておく
```

## トップページ

### コードをDLする

- .env.local

上記で作成したAPIキーとデータベースIDをセット

```
VITE_NOTION_API_KEY=ntn_1234567890
VITE_NOTION_DATA_SOURCE_ID=1234567890
```

### VSCodeの拡張機能について

必要に応じてインストール

- Prettier - Code formatter
- Tailwind CSS IntelliSense
- ESLint

### 初期次状態を確認

（口頭でざっと説明）

### Notion APIから記事一覧を取得する

#### 記事取得処理を追加

- HomePage.jsx

```jsx
useEffect(() => {
  async function fetchArticles() {
    try {
      // 1度に100件まで
      const response = await fetch(
        `https://api.notion.com/v1/databases/${import.meta.env.VITE_NOTION_DATA_SOURCE_ID}/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sorts: [{ property: '公開日', direction: 'descending' }],
          }),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Notion API error: ${response.status} ${text}`);
      }

      const data = await response.json();
      console.log(data);
    } catch (err) {
      console.log(err);
    }
  }

  fetchArticles();
}, []);
```

しかし、NotionAPIがフロントからのリクエストを想定していないためCORSエラーとなる

#### プロキシサーバー経由でAPIリクエスト

- vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/notion': {
        target: 'https://api.notion.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notion/, ''),
      },
    },
  },
});
```

- HomePage.jsx

リクエストURLからドメインを削除する

```js
`/notion/v1/databases/${import.meta.env.VITE_NOTION_DATA_SOURCE_ID}/query`,
```

### データを整形

- データの形式

```json
// 必要な部分のみ抽出
{
  "results": [
    {
      "id": "34ed1056-1411-809b-9807-d87d53fd9406",
      "cover": null,
      "properties": {
        "タグ": {
          "type": "multi_select",
          "multi_select": [
            {
              "name": "チーム"
            },
            {
              "name": "福利厚生"
            }
          ]
        },
        "ライター": {
          "type": "select",
          "select": {
            "name": "日暮里 舞"
          }
        },
        "公開": {
          "type": "checkbox",
          "checkbox": true
        },
        "公開日": {
          "type": "date",
          "date": {
            "start": "2026-04-25"
          }
        },
        "名前": {
          "type": "title",
          "title": [
            {
              "type": "text",
              "plain_text": "開発効率アップ！デュアルモニター購入補助制度の活用事例"
            }
          ]
        }
      }
    },
    {
      ~ 省略 ~
    }
  ]
}
```

- HomePage.jsx

```js
const data = await response.json();

const articleMetaList = (data.results || []).map((page) => {
  const props = page.properties || {};

  const title =
    props['名前']?.title?.map((item) => item.plain_text).join('') || '';

  const tags = (props['タグ']?.multi_select || []).map((tag) => tag.name) || [];

  const writer = props['ライター']?.select?.name || '';

  const publishedAt = props['公開日']?.date?.start || '';

  let coverImageUrl = null;

  if (page.cover) {
    if (page.cover.type === 'external') {
      coverImageUrl = page.cover.external?.url || null;
    } else if (page.cover.type === 'file') {
      coverImageUrl = page.cover.file?.url || null;
    }
  }

  return {
    id: page.id,
    title,
    tags,
    writer: writer,
    date: publishedAt,
    coverImageUrl: coverImageUrl ? coverImageUrl : '',
    defaultImage: '/default_01.png',
  };
});

console.log(articleMetaList);
```

### タグ一覧を作成

```js
const tags = new Set();

articleMetaList.forEach((article) => {
  article.tags.forEach((tag) => {
    tags.add(tag);
  });
});
console.log(tags);
```

### データを反映

ステート定義

```jsx
const [articleList, setArticleList] = useState([]);
const [tagList, setTagList] = useState([]);
```

ステート更新

```jsx
setTagList([...tags]);
setArticleList(articleMetaList);
```

### 調整（完成コード）

- タグ一覧エリア追加
- ローディング・エラー処理追加
- 記事データパース関数を外に出す
- 公開ステータスのチェック

```jsx
import { useEffect, useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import Tag from '@/components/Tag';
import getMeta from '@/utils/getMeta';

export default function HomePage() {
  const [articleList, setArticleList] = useState([]);
  const [tagList, setTagList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        setError('');

        // 1度に100件まで
        const response = await fetch(
          `/notion/v1/databases/${import.meta.env.VITE_NOTION_DATA_SOURCE_ID}/query`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sorts: [{ property: '公開日', direction: 'descending' }],
            }),
          },
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Notion API error: ${response.status} ${text}`);
        }

        const data = await response.json();

        const articleMetaList = (data.results || [])
          .map((page) => {
            return getMeta(page);
          })
          .filter((page) => page.isPublic);

        const tags = new Set();

        articleMetaList.forEach((article) => {
          article.tags.forEach((tag) => {
            tags.add(tag);
          });
        });

        setTagList([...tags]);
        setArticleList(articleMetaList);
      } catch (err) {
        setError(err.message || '取得に失敗しました');
      }
      setLoading(false);
    }

    fetchArticles();
  }, []);

  if (loading)
    return (
      <p className="flex justify-center items-center h-screen">読み込み中...</p>
    );
  if (error)
    return <p className="flex justify-center items-center h-screen">{error}</p>;

  return (
    <>
      {/* タグ一覧 */}
      <section className="mt-12 px-6">
        <ul className="max-w-(--max-w-content) mx-auto flex flex-wrap gap-3">
          {tagList.map((tag, key) => (
            <Tag key={key} variant="list" label={tag} />
          ))}
        </ul>
      </section>
      {/* 記事一覧 */}
      <section className="mt-12 px-6">
        <ul className="max-w-(--max-w-content) mx-auto grid grid-cols-3 gap-x-8 gap-y-12">
          {articleList.map((article, key) => (
            <ArticleCard article={article} key={key} />
          ))}
        </ul>
      </section>
    </>
  );
}
```

## タグページ

TOPページとロジックは同じ。リクエストに"タグ"でfilterする記述を追加するのみ

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ArticleCard from '@/components/ArticleCard';
import getMeta from '@/utils/getMeta';

export default function TagPage() {
  const { tagName } = useParams();
  const decodedTagName = decodeURIComponent(tagName);
  const [articleList, setArticleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/notion/v1/databases/${import.meta.env.VITE_NOTION_DATA_SOURCE_ID}/query`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              // トップページとの差分
              filter: {
                property: 'タグ',
                multi_select: {
                  contains: decodedTagName,
                },
              },
              sorts: [{ property: '公開日', direction: 'descending' }],
            }),
          },
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Notion API error: ${response.status} ${text}`);
        }

        const data = await response.json();

        const articleMetaList = (data.results || [])
          .map((page) => {
            return getMeta(page);
          })
          .filter((page) => page.isPublic);

        setArticleList(articleMetaList);
      } catch (err) {
        setError(err.message || '取得に失敗しました');
      } // try

      setLoading(false);
    } // function

    fetchArticles();
  }, [tagName]);

  if (loading)
    return (
      <p className="flex justify-center items-center h-screen">読み込み中...</p>
    );
  if (error)
    return <p className="flex justify-center items-center h-screen">{error}</p>;

  return (
    <>
      <section className="mt-12 px-6">
        <h1 className="max-w-(--max-w-content) mx-auto grid grid-cols-3 gap-x-8 gap-y-12">
          「{decodedTagName}」の記事： {articleList.length}件
        </h1>
      </section>

      <section className="mt-12 px-6">
        <ul className="max-w-(--max-w-content) mx-auto grid grid-cols-3 gap-x-8 gap-y-12">
          {articleList.map((article, key) => (
            <ArticleCard article={article} key={key} />
          ))}
        </ul>
      </section>
    </>
  );
}
```

## 記事ページ

### Notion APIから記事データを取得する

次の2つのリクエストが必要

```
a. 記事メタデータ（タイトルやライターなど）を取得するリクエスト
b. 記事本文データを取得するリクエスト
```

- ArticlePage.jsx

```jsx
useEffect(() => {
  async function fetchArticle() {
    // a. 記事メタデータ（タイトルやライターなど）を取得するリクエスト
    const pageMetaRes = await fetch(`/notion/v1/pages/${id}`, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const pageMeta = await pageMetaRes.json();
    console.log(pageMeta);

    // b. 記事本文データを取得するリクエスト
    const pageBlocksRes = await fetch(`/notion/v1/blocks/${id}/children`, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const pageBlocks = await pageBlocksRes.json();

    console.log(pageBlocks);
  }

  fetchArticle();
}, [id]);
```

### 記事メタデータを表示する

- ArticlePage.jsx

差分は下記

```
- 記事本文取得の処理を一旦、削除
- 記事データをセットするステートを作成
- メタデータを上記ステートにセット
```

コードを置き換える

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import formatDate from '@/utils/formatDate';
import Tag from '@/components/Tag';
import getMeta from '@/utils/getMeta';
import blocksToMarkdown from '@/utils/blocksToMarkdown';

export default function ArticlePage() {
  const { id } = useParams();

  const [article, setArticle] = useState(null);

  useEffect(() => {
    async function fetchArticle() {
      // a. 記事メタデータ（タイトルやライターなど）を取得するリクエスト
      const pageMetaRes = await fetch(`/notion/v1/pages/${id}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
        },
      });

      const pageMeta = await pageMetaRes.json();
      // カード作成時にメタデータを取得した処理と同じでいける
      const { title, tags, writer, date, coverImageUrl } = getMeta(pageMeta);

      setArticle({
        id,
        title,
        tags,
        writer,
        date,
        coverImageUrl,
        content: '',
      });
    }

    fetchArticle();
  }, [id]);

  if (!article) return null;

  return (
    <div className="mt-12 px-6">
      <div className="max-w-(--max-w-content) mx-auto bg-white px-10 md:px-20 lg:px-35 pt-10 pb-16 rounded-xl">
        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            width="640"
            className="mx-auto rounded-lg w-full"
          />
        )}

        <h1 className="text-xl mt-8">{article.title}</h1>

        <div className="flex items-center justify-between text-sm mt-6">
          <div className="flex gap-3">
            <span>{formatDate(article.date)}</span>
            <span className="font-bold">{article.writer}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          {article.tags.map((tag) => (
            <Tag label={tag} key={tag} variant="article" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 記事データをパースする

#### 方針

パターンAで今回は実装。TailwindCSSの`prose`クラスに記事のCSSを任せたいため。より自由に装飾したい場合はパターンBを採用すると良い。

```
A. Notionの記事Block → MarkDown → HTML

- 記事ブロックをパースしてMarkDownを作成
- MarkDownを`Marked`を使ってHTMLに変換
- 上記HTMLを画面に表示

B. Notionの記事Block → HTML

- 記事ブロックをパースして直接HTMLに変換
- 上記HTMLを画面に表示
```

[参考：【 TailwindCSS 】記事が一瞬で美麗になる "prose" クラスのすすめ](https://zenn.dev/adamof/articles/4474cf6403a109)

#### 記事データ取得処理を復活

```jsx
const pageBlocksRes = await fetch(`/notion/v1/blocks/${id}/children`, {
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
  },
});

const pageBlocks = await pageBlocksRes.json();
console.log(pageBlocks);
```

#### 記事データの形式

```json
[
  {
    "type": "heading_2",
    "heading_2": {
      "rich_text": [
        {
          "plain_text": "見出し見出し見出し"
        }
      ]
    }
  },
  {
    "type": "paragraph",
    "paragraph": {
      "rich_text": [
        {
          "plain_text": "テキストテキストテキスト"
        }
      ]
    }
  },
  {
    "type": "image",
    "image": {
      "file": {
        "url": "https://example.com/sample.png?X-Amz-Algorithm..."
      }
    }
  }
]
```

#### 記事データ → MarkDown

```jsx
const markdown = blocksToMarkdown(pageBlocks.results);
console.log(markdown);
```

#### MarkDwon → HTML

ライブラリインストール

```
npm i marked isomorphic-dompurify
```

ライブラリの読み込み

```jsx
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
```

HTMLに変換する

```jsx
const bodyParsed = await marked.parse(markdown);
// HTMLをサニタイズ
const content = DOMPurify.sanitize(bodyParsed);
console.log(content);
```

ステートに記事本文をセット

```jsx
setArticle({
  id,
  title,
  tags,
  writer,
  date,
  coverImageUrl,
  content,
});
```

記事本文を表示する

```jsx
<article
  className="prose mt-8 max-w-none"
  dangerouslySetInnerHTML={{ __html: article.content }}
/>
```

### 調整（完成コード）

差分は下記

```
- エラー処理追加
- 読み込み中処理追加
```

コードを置き換える

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import formatDate from '@/utils/formatDate';
import Tag from '@/components/Tag';
import getMeta from '@/utils/getMeta';
import blocksToMarkdown from '@/utils/blocksToMarkdown';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

export default function ArticlePage() {
  const { id } = useParams();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchArticle() {
      try {
        setLoading(true);
        setError('');
        // a. 記事メタデータ（タイトルやライターなど）を取得するリクエスト
        const pageMetaRes = await fetch(`/notion/v1/pages/${id}`, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
          },
        });

        if (!pageMetaRes.ok) {
          const text = await pageMetaRes.text();
          throw new Error(`Notion API error: ${pageMetaRes.status} ${text}`);
        }

        const pageMeta = await pageMetaRes.json();
        // カード作成時にメタデータを取得した処理と同じでいける
        const { title, tags, writer, date, coverImageUrl } = getMeta(pageMeta);

        // b. 記事本文データを取得するリクエスト
        const pageBlocksRes = await fetch(`/notion/v1/blocks/${id}/children`, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
          },
        });

        if (!pageBlocksRes.ok) {
          const text = await pageBlocksRes.text();
          throw new Error(`Notion API error: ${pageBlocksRes.status} ${text}`);
        }

        const pageBlocks = await pageBlocksRes.json();

        const markdown = blocksToMarkdown(pageBlocks.results);
        const bodyParsed = await marked.parse(markdown);
        // HTMLをサニタイズ
        const content = DOMPurify.sanitize(bodyParsed);

        setArticle({
          id,
          title,
          tags,
          writer,
          date,
          coverImageUrl,
          content,
        });
      } catch (err) {
        setError(err.message || '取得に失敗しました');
      }
      setLoading(false);
    }

    fetchArticle();
  }, [id]);

  if (loading)
    return (
      <p className="flex justify-center items-center h-screen">読み込み中...</p>
    );
  if (error)
    return <p className="flex justify-center items-center h-screen">{error}</p>;

  return (
    <div className="mt-12 px-6">
      <div className="max-w-(--max-w-content) mx-auto bg-white px-10 md:px-20 lg:px-35 pt-10 pb-16 rounded-xl">
        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            width="640"
            className="mx-auto rounded-lg w-full"
          />
        )}

        <h1 className="text-xl mt-8">{article.title}</h1>

        <div className="flex items-center justify-between text-sm mt-6">
          <div className="flex gap-3">
            <span>{formatDate(article.date)}</span>
            <span className="font-bold">{article.writer}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          {article.tags.map((tag) => (
            <Tag label={tag} key={tag} variant="article" />
          ))}
        </div>
        <article
          className="prose mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  );
}
```
