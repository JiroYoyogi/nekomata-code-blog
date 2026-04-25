export default function getSummary(page) {
  const props = page.properties || {};

  const title =
    props['名前']?.title?.map((item) => item.plain_text).join('') || '';

  const tags = (props['タグ']?.multi_select || []).map((tag) => tag.name) || [];

  const writer = props['ライター']?.select?.name || '';

  const publishedAt = props['公開日']?.date?.start || '';

  let coverImageUrl = null;

  if (page.cover) {
    if (page.cover.type === 'external') {
      coverImageUrl = page.cover.external?.url || null;
    } else if (page.cover.type === 'file') {
      coverImageUrl = page.cover.file?.url || null;
    }
  }

  return {
    id: page.id,
    title,
    tags,
    writer: writer,
    date: publishedAt,
    coverImageUrl: coverImageUrl ? coverImageUrl : '',
    defaultImage: '/default_01.png',
    likeCount: 99,
  };
}
