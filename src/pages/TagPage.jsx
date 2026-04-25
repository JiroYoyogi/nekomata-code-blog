import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function TagPage() {
  const { tagName } = useParams();
  const decodedTagName = decodeURIComponent(tagName);

  return (
    <>
      <p className="flex-1">タグ：{decodedTagName}</p>
    </>
  );
}
