## トップページ

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

- .env.local

上記で作成したAPIキーとデータベースIDをセット

```
VITE_NOTION_API_KEY=ntn_1234567890
VITE_NOTION_DATA_SOURCE_ID=1234567890
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

```js
const data = await response.json();

const articleSummaryList = (data.results || []).map((page) => {
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

console.log(articleSummaryList);
```

### タグ一覧を作成

```js
const tags = new Set();

articleSummaryList.forEach((article) => {
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
setArticleList(articleSummaryList);
```

### 調整（完成コード）

- タグ一覧エリア追加
- ローディング・エラー処理追加
- 記事データパース関数を外に出す

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

        const articleSummaryList = (data.results || []).map((page) => {
          return getMeta(page);
        });

        const tags = new Set();

        articleSummaryList.forEach((article) => {
          article.tags.forEach((tag) => {
            tags.add(tag);
          });
        });

        setTagList([...tags]);
        setArticleList(articleSummaryList);
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
        <ul className="max-w-(--max-w-content) mx-auto flex gap-3">
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

        const articleSummaryList = (data.results || []).map((page) => {
          return getMeta(page);
        });

        setArticleList(articleSummaryList);
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
const blocksRes = await fetch(`/notion/v1/blocks/${id}/children`, {
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
  },
});

const blocksData = await blocksRes.json();
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
