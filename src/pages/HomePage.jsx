import { useEffect, useState } from 'react';
import ArticleCard from '@/components/ArticleCard';

const articleList = [
  {
    id: '1',
    title: '記事タイトル',
    date: '2026-04-25T12:00:00.000Z',
    author: '代々木二郎',
    imageSrc: 'dummy_01.png',
    tags: ['AWS', 'Lambda', 'JS'],
  },
  {
    id: '2',
    title: '記事タイトル',
    date: '2026-04-25T12:00:00.000Z',
    author: '代々木二郎',
    imageSrc: 'dummy_01.png',
    tags: ['AWS', 'Lambda', 'JS'],
  },
  {
    id: '3',
    title: '記事タイトル',
    date: '2026-04-25T12:00:00.000Z',
    author: '代々木二郎',
    imageSrc: 'dummy_01.png',
    tags: ['AWS', 'Lambda', 'JS'],
  },
];

export default function HomePage() {
  return (
    <>
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
