## Notionでデータベースを作成する

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
        `https://api.notion.com/notion/v1/databases/${import.meta.env.VITE_NOTION_DATA_SOURCE_ID}/query`,
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

#### 取得したデータを整形する

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
    likeCount: 99,
  };
});

console.log(articleSummaryList);
```

#### タグ一覧を取得する

```js
const tags = new Set();

articleSummaryList.forEach((article) => {
  article.tags.forEach((tag) => {
    tags.add(tag);
  });
});
console.log(tags);
```

#### 記事一覧・タグ一覧をステートにセットする

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

#### 完成コード

- タグ一覧エリア追加
- ローディング・エラー処理追加
- 記事データパース関数を外に出す

```jsx
import { useEffect, useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import Tag from '@/components/Tag';
import getSummary from '@/utils/getSummary';

export default function HomePage() {
  const [articleList, setArticleList] = useState([]);
  const [tagList, setTagList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

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
          return getSummary(page);
        });

        const tags = new Set();

        articleSummaryList.forEach((article) => {
          article.tags.forEach((tag) => {
            tags.add(tag);
          });
        });

        // ajax中にページ遷移した場合の存在しないstate操作を回避
        if (!cancelled) {
          setTagList([...tags]);
          setArticleList(articleSummaryList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '取得に失敗しました');
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    fetchArticles();

    return () => {
      cancelled = true;
    };
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
