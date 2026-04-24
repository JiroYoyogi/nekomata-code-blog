import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TagPage() {
  const { tagName } = useParams();
  const decodedTagName = decodeURIComponent(tagName);

  return (
    <>
      <Header />

      <p>タグ：{decodedTagName}</p>

      <Footer />
    </>
  );
}
