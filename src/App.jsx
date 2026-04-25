import { Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import TagPage from '@/pages/TagPage';
import ArticlePage from '@/pages/ArticlePage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function App() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tags/:tagName" element={<TagPage />} />
          <Route path="/articles/:id" element={<ArticlePage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
