import { Link } from 'react-router-dom';
export default function Tag({ label = '', variant = 'list' }) {
  const baseStyle =
    'px-2 py-2 leading-none rounded-sm transition cursor-pointer hover:bg-(--color-accent) hover:text-(--color-main)';
  const variantStyles = {
    list: 'bg-white text-sm', // タグ一覧
    card: 'bg-(--color-base) text-xs', // 記事リンク
    article: 'bg-(--color-base) text-sm', // 記事ヘッダー
  };

  const className = `${baseStyle} ${variantStyles[variant]}`;

  return (
    <Link to={`/tags/${encodeURIComponent(label)}`} className={className}>
      {label}
    </Link>
  );
}
