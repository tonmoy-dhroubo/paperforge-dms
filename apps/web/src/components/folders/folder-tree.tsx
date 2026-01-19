'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import styles from './folder-tree.module.css';

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  isDeleted: boolean;
};

const ROOT_FOLDER_ID = '00000000-0000-4000-8000-000000000001';

export function FolderTree() {
  const pathname = usePathname();
  const selectedFolderId = useMemo(() => {
    const m = pathname?.match(/\/app\/folder\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [pathname]);

  const [root, setRoot] = useState<Folder | null>(null);
  const [childrenById, setChildrenById] = useState<Record<string, Folder[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [ROOT_FOLDER_ID]: true });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setError(null);
    api
      .rootFolder()
      .then((f) => {
        if (!mounted) return;
        setRoot(f);
        return api.folderChildren(f.id);
      })
      .then((kids) => {
        if (!mounted || !kids) return;
        setChildrenById((m) => ({ ...m, [ROOT_FOLDER_ID]: kids }));
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load folders');
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function toggle(id: string) {
    const next = !expanded[id];
    setExpanded((m) => ({ ...m, [id]: next }));
    if (!next) return;
    if (childrenById[id]) return;

    setLoading((m) => ({ ...m, [id]: true }));
    try {
      const kids = await api.folderChildren(id);
      setChildrenById((m) => ({ ...m, [id]: kids }));
    } finally {
      setLoading((m) => ({ ...m, [id]: false }));
    }
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!root) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.tree}>
      <Node
        folder={root}
        depth={0}
        selectedFolderId={selectedFolderId}
        expanded={expanded}
        loading={loading}
        childrenById={childrenById}
        onToggle={toggle}
      />
    </div>
  );
}

function Node(props: {
  folder: Folder;
  depth: number;
  selectedFolderId: string | null;
  expanded: Record<string, boolean>;
  loading: Record<string, boolean>;
  childrenById: Record<string, Folder[]>;
  onToggle: (id: string) => void;
}) {
  const id = props.folder.id;
  const kids = props.childrenById[id] || [];
  const isExpanded = !!props.expanded[id];
  const isSelected = props.selectedFolderId === id;
  const hasLoadedKids = id in props.childrenById;
  const canExpand = hasLoadedKids ? kids.length > 0 : true;

  return (
    <div>
      <div className={styles.row} style={{ paddingLeft: 12 + props.depth * 14 }}>
        <button
          className={styles.twisty}
          onClick={() => props.onToggle(id)}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          disabled={!canExpand}
          title={canExpand ? undefined : 'No children'}
        >
          <span className={styles.twistyGlyph}>{canExpand ? (isExpanded ? '–' : '+') : '·'}</span>
        </button>
        <Link href={`/app/folder/${id}`} className={styles.link} data-selected={isSelected ? 'true' : 'false'}>
          <span className={styles.name}>{props.folder.name}</span>
          {props.loading[id] && <span className={styles.loadingInline}>…</span>}
        </Link>
      </div>

      {isExpanded &&
        kids.map((k) => (
          <Node
            key={k.id}
            folder={k}
            depth={props.depth + 1}
            selectedFolderId={props.selectedFolderId}
            expanded={props.expanded}
            loading={props.loading}
            childrenById={props.childrenById}
            onToggle={props.onToggle}
          />
        ))}
    </div>
  );
}

