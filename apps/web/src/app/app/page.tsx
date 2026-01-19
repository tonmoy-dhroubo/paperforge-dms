'use client';

import Link from 'next/link';
import { Panel, Pill } from '@/ui/kit';
import styles from './home.module.css';

export default function AppHome() {
  return (
    <div className={styles.grid}>
      <div className={styles.hero}>
        <div className={styles.hTitle}>The Archive</div>
        <div className={styles.hSub}>
          Upload PDFs, let OCR extract text, then search like you mean it.
        </div>
        <div className={styles.hBadges}>
          <Pill>Folders</Pill>
          <Pill>Versioning</Pill>
          <Pill>OCR</Pill>
          <Pill>Search</Pill>
        </div>
      </div>

      <Panel title="Start">
        <div className={styles.cards}>
          <Link className={styles.card} href="/app/folder/00000000-0000-4000-8000-000000000001">
            <div className={styles.cardTitle}>Open ROOT</div>
            <div className={styles.cardBody}>Browse folders and upload documents into the tree.</div>
          </Link>
          <Link className={styles.card} href="/app/folder/00000000-0000-4000-8000-000000000001?q=paperforge">
            <div className={styles.cardTitle}>Try Search</div>
            <div className={styles.cardBody}>Search inside a folder (latest versions by default).</div>
          </Link>
        </div>
      </Panel>

      <Panel title="How it flows">
        <ol className={styles.steps}>
          <li>Upload → commit (signed URL).</li>
          <li>OCR worker extracts per‑page text.</li>
          <li>Search indexer chunks & indexes into Elasticsearch.</li>
          <li>Results jump straight to page.</li>
        </ol>
      </Panel>
    </div>
  );
}

