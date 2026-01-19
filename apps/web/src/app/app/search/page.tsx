'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Hint, Input, Panel, Pill } from '@/ui/kit';
import styles from './search.module.css';

export default function GlobalSearchPage() {
  const [q, setQ] = useState('');
  const [folderId, setFolderId] = useState('');
  const [allVersions, setAllVersions] = useState(false);
  const [hits, setHits] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setHits([]);
    try {
      const res = await api.search({
        q: q.trim(),
        folderId: folderId.trim() || undefined,
        allVersions,
      });
      setHits(res.hits || []);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <Panel
        title="Global search"
        right={<Pill>{allVersions ? 'all versions' : 'latest only'}</Pill>}
      >
        <form onSubmit={runSearch} className={styles.form}>
          <label className={styles.label}>
            <span>Query</span>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search OCR text…" />
          </label>
          <label className={styles.label}>
            <span>Folder scope (optional)</span>
            <Input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Folder ID (requires FOLDER_READ)"
            />
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={allVersions} onChange={(e) => setAllVersions(e.target.checked)} />
            Search all versions (requires ACCESS_ALL_FOLDERS if no folderId)
          </label>
          <div className={styles.actions}>
            <Button type="submit" variant="accent" disabled={!q.trim() || busy}>
              Search
            </Button>
            {busy && <Hint>Searching…</Hint>}
          </div>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.results}>
          {hits.length === 0 && !busy && !error && <Hint>No results yet.</Hint>}
          {hits.map((h) => (
            <div key={h.id} className={styles.hit}>
              <div className={styles.hitTop}>
                <div className={styles.hitFilename}>{h.filename}</div>
                <Pill>p{h.pageNumber}</Pill>
              </div>
              <div
                className={styles.snip}
                dangerouslySetInnerHTML={{ __html: (h.highlights?.[0] || '').replaceAll('\n', ' ') }}
              />
              <div className={styles.hitMeta}>
                <span className={styles.mono}>{h.documentId?.slice(0, 8)}</span>
                <span className={styles.dot} aria-hidden />
                <span className={styles.mono}>v{h.versionNumber}</span>
                <span className={styles.dot} aria-hidden />
                <span className={styles.mono}>{h.folderId?.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

