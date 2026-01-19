'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
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
  const [docDetails, setDocDetails] = useState<Record<string, any[]>>({});
  const [docDetailsOpen, setDocDetailsOpen] = useState<Record<string, boolean>>({});
  const [docActionBusy, setDocActionBusy] = useState<string | null>(null);

  const [query, setQuery] = useState(q);
  useEffect(() => setQuery(q), [q]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLastFile, setUploadLastFile] = useState<File | null>(null);

  const [folderActionNote, setFolderActionNote] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [moveTargetId, setMoveTargetId] = useState('');
  const [grantsExplicit, setGrantsExplicit] = useState<Array<{ roleName: string; operationalRole: string }> | null>(
    null,
  );
  const [grantsEffective, setGrantsEffective] = useState<any | null>(null);
  const [grantsInput, setGrantsInput] = useState('');

  useEffect(() => {
    setDocsError(null);
    setDocsLoading(true);
    Promise.all([api.getFolder(folderId).catch(() => null), api.listDocuments(folderId)])
      .then(([folderRes, docsRes]) => {
        setFolder(folderRes);
        setDocs(docsRes.documents || []);
        setRenameFolderName(folderRes?.name || '');
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
    setUploadProgress(0);
    setUploadLastFile(file);
    setUploadNote('Creating upload…');
    try {
      const create = await api.createDocument({ folderId, filename: file.name, title: file.name.replace(/\\.pdf$/i, '') });
      setUploadNote('Uploading to object storage…');
      await uploadWithProgress(create.upload.url, file, (p) => setUploadProgress(p));
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
      setTimeout(() => setUploadProgress(null), 2000);
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

  async function refreshGrants() {
    try {
      const [explicit, effective] = await Promise.all([
        api.folderGrantsExplicit(folderId),
        api.folderGrantsEffective(folderId),
      ]);
      setGrantsExplicit(explicit || []);
      setGrantsEffective(effective || null);
    } catch (e: any) {
      setFolderActionNote(e?.message || 'Failed to load grants');
    }
  }

  async function createChildFolder() {
    if (!newFolderName.trim()) return;
    setFolderActionNote('Creating folder…');
    try {
      await api.createFolder({ name: newFolderName.trim(), parentId: folderId });
      setNewFolderName('');
      setFolderActionNote('Folder created.');
    } catch (e: any) {
      setFolderActionNote(e?.message || 'Failed to create folder');
    }
  }

  async function renameFolder() {
    if (!renameFolderName.trim()) return;
    setFolderActionNote('Renaming folder…');
    try {
      await api.renameFolder(folderId, { name: renameFolderName.trim() });
      setFolderActionNote('Folder renamed.');
    } catch (e: any) {
      setFolderActionNote(e?.message || 'Failed to rename folder');
    }
  }

  async function moveFolder() {
    if (!moveTargetId.trim()) return;
    setFolderActionNote('Moving folder…');
    try {
      await api.moveFolder(folderId, { newParentId: moveTargetId.trim() });
      setMoveTargetId('');
      setFolderActionNote('Folder moved.');
      router.push(`/app/folder/${moveTargetId.trim()}`);
    } catch (e: any) {
      setFolderActionNote(e?.message || 'Failed to move folder');
    }
  }

  async function deleteFolder() {
    setFolderActionNote('Deleting folder…');
    try {
      await api.deleteFolder(folderId);
      setFolderActionNote('Folder deleted (soft).');
    } catch (e: any) {
      setFolderActionNote(e?.message || 'Failed to delete folder');
    }
  }

  async function restoreFolder() {
    setFolderActionNote('Restoring folder…');
    try {
      await api.restoreFolder(folderId);
      setFolderActionNote('Folder restored.');
    } catch (e: any) {
      setFolderActionNote(e?.message || 'Failed to restore folder');
    }
  }

  async function toggleDocDetails(docId: string) {
    setDocDetailsOpen((m) => ({ ...m, [docId]: !m[docId] }));
    if (docDetails[docId]) return;
    const res = await api.docVersions(docId);
    setDocDetails((m) => ({ ...m, [docId]: res.versions || [] }));
  }

  async function deleteDoc(docId: string) {
    setDocActionBusy(docId);
    try {
      await api.deleteDocument(docId);
      await refreshDocs();
    } finally {
      setDocActionBusy(null);
    }
  }

  async function restoreDoc(docId: string) {
    setDocActionBusy(docId);
    try {
      await api.restoreDocument(docId);
      await refreshDocs();
    } finally {
      setDocActionBusy(null);
    }
  }

  async function retryOcr(versionId: string) {
    await api.ocrRetry(versionId);
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
          {uploadProgress !== null && <div className={styles.uploadProgress}>Upload {uploadProgress}%</div>}
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
                    <button className={styles.inlineBtn} onClick={() => toggleDocDetails(d.id)}>
                      {docDetailsOpen[d.id] ? 'hide' : 'details'}
                    </button>
                    {!d.isDeleted ? (
                      <button
                        className={styles.inlineBtnDanger}
                        onClick={() => deleteDoc(d.id)}
                        disabled={docActionBusy === d.id}
                      >
                        delete
                      </button>
                    ) : (
                      <button
                        className={styles.inlineBtn}
                        onClick={() => restoreDoc(d.id)}
                        disabled={docActionBusy === d.id}
                      >
                        restore
                      </button>
                    )}
                  </div>
                  {docDetailsOpen[d.id] && (
                    <div className={styles.docDetails}>
                      {(docDetails[d.id] || []).map((v: any) => (
                        <div key={v.id} className={styles.versionRow}>
                          <div className={styles.versionLeft}>
                            <span className={styles.mono}>v{v.versionNumber}</span>
                            <span className={styles.dim}>{v.originalFilename}</span>
                          </div>
                          <div className={styles.versionRight}>
                            <Link className={styles.previewLink} href={`/app/preview/${v.id}`}>
                              preview
                            </Link>
                            <button className={styles.inlineBtn} onClick={() => retryOcr(v.id)}>
                              retry OCR
                            </button>
                          </div>
                        </div>
                      ))}
                      {docDetails[d.id]?.length === 0 && <Hint>No versions yet.</Hint>}
                    </div>
                  )}
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

        <div className={styles.grid}>
          <section className={styles.col}>
            <div className={styles.sectionTitle}>Upload zone</div>
            <div
              className={styles.drop}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void uploadPdf(f);
              }}
            >
              <div className={styles.dropTitle}>Drop a PDF here</div>
              <div className={styles.dropBody}>or click “Upload PDF” in the header.</div>
              {uploadLastFile && (
                <div className={styles.dropHint}>
                  Last file: {uploadLastFile.name}{' '}
                  <button className={styles.inlineBtn} onClick={() => uploadPdf(uploadLastFile)}>
                    retry
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className={styles.col}>
            <div className={styles.sectionTitle}>Folder actions</div>
            <div className={styles.actionGrid}>
              <label className={styles.label}>
                <span>Create child folder</span>
                <div className={styles.rowInline}>
                  <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Name" />
                  <Button variant="accent" onClick={createChildFolder}>
                    Create
                  </Button>
                </div>
              </label>

              <label className={styles.label}>
                <span>Rename current folder</span>
                <div className={styles.rowInline}>
                  <Input value={renameFolderName} onChange={(e) => setRenameFolderName(e.target.value)} />
                  <Button onClick={renameFolder}>Rename</Button>
                </div>
              </label>

              <label className={styles.label}>
                <span>Move current folder</span>
                <div className={styles.rowInline}>
                  <Input
                    value={moveTargetId}
                    onChange={(e) => setMoveTargetId(e.target.value)}
                    placeholder="Target folder ID"
                  />
                  <Button onClick={moveFolder} disabled={folderId === '00000000-0000-4000-8000-000000000001'}>
                    Move
                  </Button>
                </div>
              </label>

              <div className={styles.rowInline}>
                <Button
                  variant="danger"
                  onClick={deleteFolder}
                  disabled={folderId === '00000000-0000-4000-8000-000000000001'}
                >
                  Delete
                </Button>
                <Button onClick={restoreFolder}>Restore</Button>
                <Button onClick={refreshGrants}>Refresh grants</Button>
              </div>

              <label className={styles.label}>
                <span>Set explicit grants</span>
                <Input
                  value={grantsInput}
                  onChange={(e) => setGrantsInput(e.target.value)}
                  placeholder="ADMIN:OWNER, HR:VIEWER"
                />
                <Button
                  onClick={() => {
                    const grants = grantsInput
                      .split(',')
                      .map((g) => g.trim())
                      .filter(Boolean)
                      .map((g) => {
                        const [roleName, operationalRole] = g.split(':');
                        return { roleName: roleName.trim(), operationalRole: (operationalRole || '').trim() };
                      })
                      .filter((g) => g.roleName && g.operationalRole);
                    api
                      .setFolderGrants(folderId, { grants })
                      .then(() => setFolderActionNote('Grants updated.'))
                      .catch((e: any) => setFolderActionNote(e?.message || 'Failed to set grants'));
                  }}
                >
                  Apply
                </Button>
              </label>

              {folderActionNote && <div className={styles.note}>{folderActionNote}</div>}
            </div>

            <div className={styles.grantsGrid}>
              <div>
                <div className={styles.subTitle}>Explicit</div>
                <div className={styles.grants}>
                  {(grantsExplicit || []).length === 0 && <Hint>No explicit grants.</Hint>}
                  {(grantsExplicit || []).map((g, idx) => (
                    <Pill key={`${g.roleName}-${g.operationalRole}-${idx}`}>
                      {g.roleName}:{g.operationalRole}
                    </Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className={styles.subTitle}>Effective</div>
                <div className={styles.grants}>
                  {!grantsEffective && <Hint>Load grants to view.</Hint>}
                  {grantsEffective?.grants?.map((g: any, idx: number) => (
                    <Pill key={`${g.roleName}-${g.operationalRole}-${idx}`}>
                      {g.roleName}:{g.operationalRole}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </Panel>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        onProgress(pct);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed (network error)'));
    xhr.send(file);
  });
}
