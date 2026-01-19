'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, putToPresignedUrl } from '@/lib/api';
import { Button, Hint, Input, Panel, Pill } from '@/ui/kit';
import styles from './folder.module.css';

type DocRow = {
  id: string;
  title: string | null;
  latestVersionId: string | null;
  isDeleted: boolean;
  createdAt: string;
};

export default function FolderPage() {
  const params = useParams<{ folderId: string }>();
  const folderId = params.folderId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') || '').trim();

  const [folder, setFolder] = useState<any | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [query, setQuery] = useState(q);
  useEffect(() => setQuery(q), [q]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  useEffect(() => {
    setDocsError(null);
    setDocsLoading(true);
    Promise.all([api.getFolder(folderId).catch(() => null), api.listDocuments(folderId)])
      .then(([folderRes, docsRes]) => {
        setFolder(folderRes);
        setDocs(docsRes.documents || []);
      })
      .catch((e: any) => setDocsError(e?.message || 'Failed to load documents'))
      .finally(() => setDocsLoading(false));
  }, [folderId]);

  useEffect(() => {
    if (!q) {
      setSearchHits([]);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    api
      .search({ q, folderId })
      .then((res) => setSearchHits(res.hits || []))
      .catch((e: any) => setSearchError(e?.message || 'Search failed'))
      .finally(() => setSearchLoading(false));
  }, [q, folderId]);

  const headerRight = useMemo(() => {
    return (
      <div className={styles.headerRight}>
        <Pill>{folderId === '00000000-0000-4000-8000-000000000001' ? 'ROOT' : 'Folder'}</Pill>
        <Button variant="accent" onClick={() => fileRef.current?.click()} disabled={uploadBusy}>
          Upload PDF
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadPdf(f);
            e.currentTarget.value = '';
          }}
        />
      </div>
    );
  }, [folderId, uploadBusy]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = query.trim();
    const url = next ? `/app/folder/${folderId}?q=${encodeURIComponent(next)}` : `/app/folder/${folderId}`;
    router.push(url);
  }

  async function uploadPdf(file: File) {
    if (file.type && file.type !== 'application/pdf') {
      setUploadNote('Only PDFs are supported in Phase‑1.');
      return;
    }
    setUploadBusy(true);
    setUploadNote('Creating upload…');
    try {
      const create = await api.createDocument({ folderId, filename: file.name, title: file.name.replace(/\\.pdf$/i, '') });
      setUploadNote('Uploading to object storage…');
      await putToPresignedUrl(create.upload.url, file);
      setUploadNote('Committing version… (OCR + indexing will start)');
      const committed = await api.commitVersion(create.version.id);
      setUploadNote('Queued. Waiting for OCR…');
      await waitForOcr(committed.versionId);
      setUploadNote('Done. Ready for search.');
      await refreshDocs();
    } catch (e: any) {
      setUploadNote(e?.message || 'Upload failed');
    } finally {
      setUploadBusy(false);
      setTimeout(() => setUploadNote(null), 3500);
    }
  }

  async function waitForOcr(versionId: string) {
    const start = Date.now();
    while (Date.now() - start < 60_000) {
      const s = await api.ocrStatus(versionId);
      if (s.ocrStatus === 'COMPLETED') return;
      if (s.ocrStatus === 'FAILED') throw new Error(s.ocrError || 'OCR failed');
      await sleep(800);
    }
    throw new Error('OCR timeout (still processing)');
  }

  async function refreshDocs() {
    const res = await api.listDocuments(folderId);
    setDocs(res.documents || []);
  }

  return (
    <div className={styles.wrap}>
      <Panel title={folder?.name ? `Folder · ${folder.name}` : 'Folder'} right={headerRight}>
        <div className={styles.searchRow}>
          <form onSubmit={submitSearch} className={styles.searchForm}>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search OCR text…" />
            <Button type="submit" variant="accent" disabled={!query.trim()}>
              Search
            </Button>
            {q && (
              <Button onClick={() => router.push(`/app/folder/${folderId}`)} disabled={searchLoading}>
                Clear
              </Button>
            )}
          </form>
          {uploadNote && <div className={styles.uploadNote}>{uploadNote}</div>}
        </div>

        <div className={styles.grid}>
          <section className={styles.col}>
            <div className={styles.sectionTitle}>Documents</div>
            {docsLoading && <Hint>Loading…</Hint>}
            {docsError && <div className={styles.error}>{docsError}</div>}
            {!docsLoading && !docsError && docs.length === 0 && (
              <Hint>No documents yet. Upload a PDF to seed OCR + search.</Hint>
            )}
            <div className={styles.docList}>
              {docs.map((d) => (
                <div key={d.id} className={styles.docRow}>
                  <div className={styles.docName}>
                    {d.title || d.id.slice(0, 8)}
                    {d.isDeleted && <span className={styles.deleted}>deleted</span>}
                  </div>
                  <div className={styles.docMeta}>
                    <span className={styles.mono}>latest</span>{' '}
                    {d.latestVersionId ? (
                      <Link className={styles.previewLink} href={`/app/preview/${d.latestVersionId}`}>
                        preview
                      </Link>
                    ) : (
                      <span className={styles.dim}>none</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.col}>
            <div className={styles.sectionTitle}>Search results</div>
            {!q && <Hint>Search runs on OCR text and is scoped to this folder.</Hint>}
            {searchLoading && q && <Hint>Searching…</Hint>}
            {searchError && <div className={styles.error}>{searchError}</div>}
            {q && !searchLoading && !searchError && (
              <div className={styles.results}>
                {searchHits.length === 0 ? (
                  <Hint>No matches.</Hint>
                ) : (
                  searchHits.map((h) => (
                    <Link
                      key={h.id}
                      href={`/app/preview/${h.versionId}?page=${encodeURIComponent(String(h.pageNumber || 1))}`}
                      className={styles.hit}
                    >
                      <div className={styles.hitTop}>
                        <div className={styles.hitFilename}>{h.filename}</div>
                        <div className={styles.hitRight}>
                          <Pill>p{h.pageNumber}</Pill>
                        </div>
                      </div>
                      <div
                        className={styles.snip}
                        dangerouslySetInnerHTML={{ __html: (h.highlights?.[0] || '').replaceAll('\\n', ' ') }}
                      />
                      <div className={styles.hitMeta}>
                        <span className={styles.dim}>doc</span> <span className={styles.mono}>{h.documentId?.slice(0, 8)}</span>
                        <span className={styles.dot} aria-hidden />
                        <span className={styles.dim}>v</span> <span className={styles.mono}>{h.versionNumber}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </Panel>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
