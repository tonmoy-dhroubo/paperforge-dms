'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Hint, Panel, Pill } from '@/ui/kit';
import styles from './preview.module.css';

type VersionRow = {
  id: string;
  versionNumber: number;
  uploadStatus: string;
  uploadedAt: string | null;
  originalFilename: string;
  ocrStatus: string;
  pageCount: number | null;
};

export default function PreviewPage() {
  const params = useParams<{ versionId: string }>();
  const versionId = params.versionId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);

  const [status, setStatus] = useState<any | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<Array<{ pageNumber: number; text: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageText = useMemo(() => pages?.find((p) => p.pageNumber === page)?.text || '', [pages, page]);

  useEffect(() => {
    let mounted = true;
    setBusy(true);
    setError(null);
    setDownloadUrl(null);
    setPages(null);

    api
      .ocrStatus(versionId)
      .then(async (s) => {
        if (!mounted) return;
        setStatus(s);
        const versionsRes = await api.docVersions(s.documentId);
        if (!mounted) return;
        setVersions(versionsRes.versions || []);
        const dl = await api.downloadUrl(versionId);
        if (!mounted) return;
        setDownloadUrl(`${dl.url}#page=${page}`);
        const ocr = await api.ocrPages(versionId);
        if (!mounted) return;
        setPages((ocr.pages || []).map((p: any) => ({ pageNumber: p.pageNumber, text: p.text })));
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load preview');
      })
      .finally(() => {
        if (!mounted) return;
        setBusy(false);
      });

    return () => {
      mounted = false;
    };
  }, [versionId, page]);

  const title = status?.documentId ? `Preview · ${status.documentId.slice(0, 8)}` : 'Preview';

  return (
    <div className={styles.wrap}>
      <Panel
        title={title}
        right={
          <div className={styles.right}>
            <Pill>v{versions.find((v) => v.id === versionId)?.versionNumber ?? '?'}</Pill>
            <Pill>OCR {status?.ocrStatus || '…'}</Pill>
            <Button onClick={() => router.push(`/app/folder/${status?.folderId || '00000000-0000-4000-8000-000000000001'}`)}>
              Back to folder
            </Button>
          </div>
        }
      >
        {error && <div className={styles.error}>{error}</div>}
        {busy && <Hint>Loading…</Hint>}

        {!error && (
          <div className={styles.grid}>
            <section className={styles.left}>
              <div className={styles.toolbar}>
                <div className={styles.versions}>
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      className={styles.versionBtn}
                      data-active={v.id === versionId ? 'true' : 'false'}
                      onClick={() => router.push(`/app/preview/${v.id}?page=${page}`)}
                      title={v.originalFilename}
                    >
                      v{v.versionNumber}
                    </button>
                  ))}
                </div>
                <div className={styles.pageNav}>
                  <Button
                    onClick={() => router.push(`/app/preview/${versionId}?page=${Math.max(1, page - 1)}`)}
                    disabled={page <= 1}
                  >
                    Prev
                  </Button>
                  <Pill>page {page}</Pill>
                  <Button onClick={() => router.push(`/app/preview/${versionId}?page=${page + 1}`)}>Next</Button>
                </div>
              </div>

              <div className={styles.viewer}>
                {downloadUrl ? (
                  <iframe className={styles.iframe} src={downloadUrl} title="PDF preview" />
                ) : (
                  <Hint>Waiting for signed URL…</Hint>
                )}
              </div>
            </section>

            <section className={styles.rightCol}>
              <div className={styles.sideTitle}>OCR text · page {page}</div>
              {status?.ocrStatus !== 'COMPLETED' && (
                <Hint>OCR is {String(status?.ocrStatus || 'PENDING').toLowerCase()}. Text will appear when complete.</Hint>
              )}
              {status?.ocrStatus === 'COMPLETED' && !pageText && <Hint>No text stored for this page.</Hint>}
              {pageText && <pre className={styles.ocr}>{pageText}</pre>}
              <div className={styles.actions}>
                <Button
                  variant="accent"
                  onClick={() => router.push(`/app/folder/${status?.folderId || '00000000-0000-4000-8000-000000000001'}?q=${encodeURIComponent(status?.documentId?.slice(0, 8) || '')}`)}
                >
                  Search around this doc
                </Button>
              </div>
            </section>
          </div>
        )}
      </Panel>
    </div>
  );
}

