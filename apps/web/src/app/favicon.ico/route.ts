import { NextResponse } from 'next/server';

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#f6f5f2"/>
  <rect x="10" y="10" width="44" height="44" rx="8" fill="#111111" opacity="0.06"/>
  <circle cx="22" cy="22" r="5" fill="#d0021b"/>
  <rect x="19" y="34" width="26" height="4" rx="2" fill="#111111" opacity="0.35"/>
</svg>`;

export function GET() {
  return new NextResponse(SVG, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
}

