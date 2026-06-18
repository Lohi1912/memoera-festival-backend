import sharp from 'sharp';

const FONT_SIZE    = 48;
const LINE_HEIGHT  = 62;
const SMALL_SIZE   = 34;
const PADDING      = 52;

function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + word).length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

export async function overlayText(imageBuffer, festivalName, userName, overlayText) {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width  || 1024;
  const H = meta.height || 1024;

  // Calculate max characters per line based on image width
  const maxChars = Math.floor((W - PADDING * 2) / (FONT_SIZE * 0.52));

  const headline  = `Happy ${festivalName}, ${userName}!`;
  const subLines  = wrapText(overlayText, Math.floor(maxChars * 1.1));
  const allLines  = [{ text: headline, size: FONT_SIZE, bold: true }, ...subLines.map(l => ({ text: l, size: SMALL_SIZE, bold: false }))];

  const totalTextH = allLines.length * LINE_HEIGHT + 20;
  const startY     = H - totalTextH - PADDING;

  const svgTextNodes = allLines.map(({ text, size, bold }, i) => {
    const y = startY + i * LINE_HEIGHT + size;
    return `
      <text
        x="${W / 2}" y="${y}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${size}"
        font-weight="${bold ? 'bold' : 'normal'}"
        fill="white"
        paint-order="stroke"
        stroke="rgba(0,0,0,0.75)"
        stroke-width="${bold ? 4 : 2.5}"
        stroke-linejoin="round"
      >${escapeXml(text)}</text>`;
  }).join('');

  // Bottom gradient scrim + text
  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="black" stop-opacity="0"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.65"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#scrim)"/>
      ${svgTextNodes}
    </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
