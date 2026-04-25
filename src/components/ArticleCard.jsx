import Tag from '@/components/Tag';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import formatDate from '@/utils/formatDate';

const now = new Date().getTime();

const isNew = (dateString) => {
  const publishedDate = new Date(dateString).getTime();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  return now - publishedDate < THREE_DAYS_MS;
};

export default function ArticleCard({ article }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <li className="relative flex flex-col overflow-hidden bg-white rounded-xl shadow-sm transition hover:shadow-md group">
      <div className="relative aspect-video overflow-hidden">
        {/* 16:9 */}
        <img
          src={
            article.coverImageUrl ? article.coverImageUrl : '/default_01.png'
          }
          alt={article.title}
          onLoad={() => setImageLoaded(true)}
          className={[
            'object-cover w-full h-full transition duration-500',
            'group-hover:scale-105',
            imageLoaded ? 'opacity-100 blur-0' : 'opacity-30 blur-sm',
          ].join(' ')}
        />
        {isNew(article.date) && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-bold text-white bg-black/80 rounded uppercase">
            New
          </span>
        )}
      </div>
      <div className="flex flex-col p-4 gap-3">
        {/* カード全体のリンク */}
        <p className="font-bold leading-snug text-gray-800">
          <Link
            to={`/articles/${article.id}`}
            className="after:absolute after:inset-0 after:z-0"
          >
            {article.title}
          </Link>
        </p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-3">
            <span>{formatDate(article.date)}</span>
            <span className="font-bold">{article.writer}</span>
          </div>
        </div>

        {/* z-10 でカードのリンク（::after）より上に配置 */}
        <div className="flex flex-wrap gap-2 mt-auto relative z-10">
          {article.tags.map((tag) => (
            <Tag label={tag} key={tag} variant="card" />
          ))}
        </div>
      </div>
    </li>
  );
}
