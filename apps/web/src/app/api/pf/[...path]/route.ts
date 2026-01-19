import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_BASE = (process.env.PAPERFORGE_API_INTERNAL_URL || 'http://localhost:7080/api').replace(
  /\/+$/,
  '',
);

function buildUrl(req: NextRequest, pathParts: string[]) {
  const url = new URL(req.url);
  const path = pathParts.map((p) => encodeURIComponent(p)).join('/');
  return `${INTERNAL_API_BASE}/${path}${url.search}`;
}

async function handle(req: NextRequest, ctx: { params: { path: string[] } }) {
  const upstreamUrl = buildUrl(req, ctx.params.path || []);

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const res = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  const outHeaders = new Headers(res.headers);
  outHeaders.delete('content-encoding');
  outHeaders.delete('content-length');

  return new NextResponse(res.body, {
    status: res.status,
    headers: outHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
