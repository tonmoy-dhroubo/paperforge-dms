import fs from 'node:fs/promises';
import path from 'node:path';

type JsonValue = any;

function argValue(name: string) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureTrailingSlashless(url: string) {
  return url.replace(/\/+$/, '');
}

async function fetchJson<T = JsonValue>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      (json && (typeof json.message === 'string' ? json.message : Array.isArray(json.message) ? json.message.join(',') : null)) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(`${init?.method || 'GET'} ${url} failed: ${msg}`);
  }
  return (json ?? ({} as any)) as T;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function buildPdfBytes(lines: string[]) {
  const safe = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const content = [
    'BT',
    '/F1 18 Tf',
    '72 720 Td',
    ...lines.flatMap((l, i) => (i === 0 ? [`(${safe(l)}) Tj`] : ['0 -26 Td', `(${safe(l)}) Tj`])),
    'ET',
  ].join('\n');

  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalog = addObj('<< /Type /Catalog /Pages 2 0 R >>');
  const pages = addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  const pageObj = addObj(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  );
  const streamLen = Buffer.byteLength(content, 'utf8');
  const contents = addObj(`<< /Length ${streamLen} >>\nstream\n${content}\nendstream`);
  const font = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  void catalog;
  void pages;
  void pageObj;
  void contents;
  void font;

  let out = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(out, 'utf8'));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(out, 'utf8');
  out += `xref\n0 ${objects.length + 1}\n`;
  out += `0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(out, 'utf8');
}

async function main() {
  const apiBase = ensureTrailingSlashless(
    argValue('--api') || process.env.PAPERFORGE_API_URL || 'http://localhost:7080/api',
  );
  const demoDir = path.resolve(process.cwd(), 'scripts', 'demo-pdfs');

  const username = process.env.PAPERFORGE_SEED_USERNAME || 'paperforge_admin';
  const email = process.env.PAPERFORGE_SEED_EMAIL || 'paperforge_admin@local.test';
  const password = process.env.PAPERFORGE_SEED_PASSWORD || 'Password123!';
  const promoteAdmin = hasFlag('--promote-admin') || (process.env.PAPERFORGE_SEED_PROMOTE_ADMIN || '').toLowerCase() === 'true';
  const databaseUrl =
    process.env.PAPERFORGE_SEED_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://paperforge:paperforgepass@localhost:5433/paperforge';

  const dryRun = hasFlag('--dry-run');
  const waitOcr = hasFlag('--wait-ocr');

  const demoPdfs: Array<{
    file: string;
    title: string;
    folder: 'HR' | 'LEGAL' | 'FINANCE';
    lines: string[];
  }> = [
    {
      file: 'demo-hr-handbook.pdf',
      title: 'Demo: HR Handbook (Benefits & Leave)',
      folder: 'HR',
      lines: [
        'Paperforge Demo — HR Handbook',
        'Keywords: benefits, leave, vacation, payroll, onboarding',
        'Policy: 20 days paid leave per year. Carryover allowed.',
      ],
    },
    {
      file: 'demo-legal-nda-template.pdf',
      title: 'Demo: NDA Template (Mutual)',
      folder: 'LEGAL',
      lines: ['Paperforge Demo — NDA Template', 'Keywords: confidentiality, term, jurisdiction, disclosure', 'Mutual NDA — draft'],
    },
    {
      file: 'demo-finance-quarterly-report.pdf',
      title: 'Demo: Finance Quarterly Report (Q4)',
      folder: 'FINANCE',
      lines: ['Paperforge Demo — Finance Q4 Report', 'Keywords: revenue, expenses, EBITDA, forecast', 'Summary: revenue up 12% QoQ'],
    },
  ];

  await ensureDir(demoDir);

  for (const pdf of demoPdfs) {
    const filePath = path.join(demoDir, pdf.file);
    try {
      await fs.stat(filePath);
    } catch {
      const bytes = buildPdfBytes(pdf.lines);
      await fs.writeFile(filePath, bytes);
    }
  }

  if (dryRun) {
    process.stdout.write(`dry-run: would seed demo folders + docs via ${apiBase}\n`);
    process.stdout.write(`demo pdfs: ${demoDir}\n`);
    return;
  }

  async function loginOrRegister() {
    try {
      const res = await fetchJson<{ token: string; user: { roles: string[] } }>(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: email, password }),
      });
      return res;
    } catch {
      const res = await fetchJson<{ token: string; user: { roles: string[] } }>(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      return res;
    }
  }

  async function ensureAdminToken() {
    const auth = await loginOrRegister();
    const token = auth.token;
    const me = await fetchJson<{ id: string; roles: string[] }>(`${apiBase}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (me.roles?.includes('ADMIN')) return { token, userId: me.id };
    if (!promoteAdmin) {
      throw new Error(
        `Seed user is not ADMIN (roles: ${me.roles?.join(', ') || 'none'}). Re-run with --promote-admin (dev only), or provide an ADMIN via PAPERFORGE_SEED_EMAIL/PAPERFORGE_SEED_PASSWORD, or reset DB volume and re-run so first user becomes ADMIN.`,
      );
    }

    const { Client } = await import('pg');
    const db = new Client({ connectionString: databaseUrl });
    await db.connect();
    try {
      const role = await db.query(`SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1`);
      if (!role.rows?.[0]?.id) throw new Error('ADMIN role not found in DB');

      const user = await db.query(`SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1`, [
        email.trim().toLowerCase(),
        username.trim(),
      ]);
      if (!user.rows?.[0]?.id) throw new Error('Seed user not found in DB (cannot promote)');

      await db.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.rows[0].id, role.rows[0].id],
      );
    } finally {
      await db.end();
    }

    const after = await fetchJson<{ token: string }>(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: email, password }),
    });
    return { token: after.token, userId: me.id };
  }

  const { token } = await ensureAdminToken();

  const root = await fetchJson<{ id: string; name: string }>(`${apiBase}/folders/root`, {
    headers: { authorization: `Bearer ${token}` },
  });

  async function listChildren(folderId: string) {
    return fetchJson<Array<{ id: string; name: string }>>(`${apiBase}/folders/${encodeURIComponent(folderId)}/children`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  async function ensureFolder(parentId: string, name: string) {
    const kids = await listChildren(parentId);
    const found = kids.find((k) => k.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (found) return found;
    return fetchJson<{ id: string; name: string }>(`${apiBase}/folders`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ parentId, name }),
    });
  }

  async function setGrants(folderId: string, grants: Array<{ roleName: string; operationalRole: 'OWNER' | 'VIEWER' }>) {
    return fetchJson(`${apiBase}/folders/${encodeURIComponent(folderId)}/grants`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ grants }),
    });
  }

  async function listDocs(folderId: string) {
    const res = await fetchJson<{ documents: Array<{ id: string; title: string | null }> }>(
      `${apiBase}/documents?folderId=${encodeURIComponent(folderId)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    return res.documents || [];
  }

  async function createDocWithUpload(folderId: string, title: string, filename: string) {
    return fetchJson<{
      document: { id: string };
      version: { id: string; versionNumber: number; uploadStatus: string };
      upload: { url: string; requiredHeaders: Record<string, string> };
    }>(`${apiBase}/documents`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ folderId, title, filename }),
    });
  }

  async function commit(versionId: string) {
    return fetchJson(`${apiBase}/documents/versions/commit`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ versionId }),
    });
  }

  async function getOcr(versionId: string) {
    return fetchJson<{ ocrStatus: string; pageCount: number | null }>(
      `${apiBase}/documents/versions/${encodeURIComponent(versionId)}/ocr`,
      { headers: { authorization: `Bearer ${token}` } },
    );
  }

  const hr = await ensureFolder(root.id, 'HR');
  const legal = await ensureFolder(root.id, 'Legal');
  const finance = await ensureFolder(root.id, 'Finance');

  await setGrants(hr.id, [
    { roleName: 'ADMIN', operationalRole: 'OWNER' },
    { roleName: 'HR', operationalRole: 'OWNER' },
    { roleName: 'LEGAL', operationalRole: 'VIEWER' },
  ]);
  await setGrants(legal.id, [
    { roleName: 'ADMIN', operationalRole: 'OWNER' },
    { roleName: 'LEGAL', operationalRole: 'OWNER' },
    { roleName: 'HR', operationalRole: 'VIEWER' },
  ]);
  await setGrants(finance.id, [
    { roleName: 'ADMIN', operationalRole: 'OWNER' },
    { roleName: 'HR', operationalRole: 'VIEWER' },
    { roleName: 'LEGAL', operationalRole: 'VIEWER' },
  ]);

  const folderIdByKey: Record<string, string> = { HR: hr.id, LEGAL: legal.id, FINANCE: finance.id };

  const createdVersionIds: string[] = [];

  for (const pdf of demoPdfs) {
    const folderId = folderIdByKey[pdf.folder];
    const existing = await listDocs(folderId);
    const exists = existing.some((d) => (d.title || '').trim().toLowerCase() === pdf.title.trim().toLowerCase());
    if (exists) continue;

    const filePath = path.join(demoDir, pdf.file);
    const bytes = await fs.readFile(filePath);
    const created = await createDocWithUpload(folderId, pdf.title, pdf.file);

    const put = await fetch(created.upload.url, {
      method: 'PUT',
      headers: { ...(created.upload.requiredHeaders || {}) },
      body: bytes,
    });
    if (!put.ok) {
      const text = await put.text().catch(() => '');
      throw new Error(`Upload failed for ${pdf.file}: HTTP ${put.status} ${text}`);
    }

    await commit(created.version.id);
    createdVersionIds.push(created.version.id);
  }

  process.stdout.write(`Seeded demo folders + PDFs.\n`);
  process.stdout.write(`- API: ${apiBase}\n`);
  process.stdout.write(`- Root: ${root.id}\n`);
  process.stdout.write(`- HR: ${hr.id}\n`);
  process.stdout.write(`- Legal: ${legal.id}\n`);
  process.stdout.write(`- Finance: ${finance.id}\n`);
  process.stdout.write(`- Demo PDFs: ${demoDir}\n`);

  if (waitOcr && createdVersionIds.length) {
    process.stdout.write(`Waiting for OCR (${createdVersionIds.length} versions)…\n`);
    const deadline = Date.now() + 4 * 60_000;
    const pending = new Set(createdVersionIds);
    while (pending.size && Date.now() < deadline) {
      for (const vid of Array.from(pending)) {
        const s = await getOcr(vid);
        if (s.ocrStatus && s.ocrStatus !== 'NOT_STARTED' && s.ocrStatus !== 'IN_PROGRESS') {
          pending.delete(vid);
        }
      }
      if (pending.size) await sleep(1500);
    }
    if (pending.size) process.stdout.write(`OCR still pending for ${pending.size} version(s).\n`);
    else process.stdout.write(`OCR completed.\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`${e?.message || e}\n`);
  process.exitCode = 1;
});
