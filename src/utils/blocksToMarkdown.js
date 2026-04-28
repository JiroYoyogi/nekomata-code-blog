export default function blocksToMarkdown(blocks = [], listLevel = 0) {
  let md = '';

  for (const block of blocks) {
    const type = block.type;
    let text = '';
    let lang = '';
    let code = '';
    let url = '';
    let bookmark = '';

    switch (type) {
      case 'heading_1':
        // html += `<h1>${getBlockTextMarkdown(block)}</h1>`
        md += `# ${getBlockTextMarkdown(block)}\n\n`;
        break;
      case 'heading_2':
        // html += `<h2>${getBlockTextMarkdown(block)}</h2>`
        md += `## ${getBlockTextMarkdown(block)}\n\n`;
        break;
      case 'heading_3':
        md += `### ${getBlockTextMarkdown(block)}\n\n`;
        break;
      case 'heading_4':
        md += `#### ${getBlockTextMarkdown(block)}\n\n`;
        break;
      case 'paragraph':
        text = getBlockTextMarkdown(block);
        md += text ? `${text}\n\n` : '\n';
        break;
      case 'code':
        lang = block.code?.language || '';
        code = getBlockTextMarkdown(block); // 中身はplain_text（改行保持）
        md += `\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        break;
      case 'quote':
        text = getBlockTextMarkdown(block);
        md += `> ${text}\n\n`;
        break;
      case 'bulleted_list_item':
        text = getBlockTextMarkdown(block);
        md += `${'  '.repeat(listLevel)}- ${text}\n\n`;
        if (Array.isArray(block.children) && block.children.length > 0) {
          md += blocksToMarkdown(block.children, listLevel + 1);
        }
        break;
      case 'numbered_list_item':
        text = getBlockTextMarkdown(block);
        md += `${'  '.repeat(listLevel)}1. ${text}\n\n`;
        if (Array.isArray(block.children) && block.children.length > 0) {
          md += blocksToMarkdown(block.children, listLevel + 1);
        }
        break;
      case 'image':
        url =
          block.image?.type === 'external'
            ? block.image.external?.url
            : block.image?.file?.url;
        if (url) md += `![image](${url})\n\n`;
        break;
      case 'bookmark':
        bookmark = block.bookmark?.url || '';
        md += bookmark ? `[${bookmark}](${bookmark})\n\n` : '';
        break;
      default:
    } // switch
  } // for

  return md;
}

// 見出し、テキスト、リストなどから"テキスト"取得
function getBlockTextMarkdown(block) {
  const type = block.type;
  const data = block[type];
  if (!data) return '';

  // codeブロックはrich_textをそのまま
  if (type === 'code') {
    const codeText = data.rich_text ?? [];
    return codeText.map((t) => t?.plain_text ?? '').join('');
  }
  const richText = data.rich_text ?? [];
  return richText
    .map((t) => {
      let text = t?.plain_text ?? '';
      if (t?.annotations?.code) {
        // inline code
        text = `\`${text}\``;
      }
      return text;
    })
    .join('');
}
