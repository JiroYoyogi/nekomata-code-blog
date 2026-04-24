import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ArticlePage() {
  const { id } = useParams();

  return (
    <>
      <Header />

      <p>記事：{id}</p>

      <Footer />
    </>
  );
}
