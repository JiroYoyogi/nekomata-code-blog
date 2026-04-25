import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import formatDate from '@/utils/formatDate';
import Tag from '@/components/Tag';

export default function ArticlePage() {
  const { id } = useParams();

  return <p>記事：{id}</p>;
}
