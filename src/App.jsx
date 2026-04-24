import { Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import TagPage from '@/pages/TagPage';
import ArticlePage from '@/pages/ArticlePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tags/:tagName" element={<TagPage />} />
      <Route path="/articles/:id" element={<ArticlePage />} />
    </Routes>
  );
}
