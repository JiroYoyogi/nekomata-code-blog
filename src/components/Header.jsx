import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="flex items-center justify-between bg-white py-4 px-6">
      <h1>
        <Link to="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.png" alt="" className="w-10" />
          NEKOMATA CODE ★️ 社内ブログ
        </Link>
      </h1>
    </header>
  );
}
