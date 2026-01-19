'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/design/theme-provider';
import { api } from '@/lib/api';
import { clearTokens, getToken } from '@/lib/auth';
import { Button, Pill } from '@/ui/kit';
import { FolderTree } from '@/components/folders/folder-tree';
import styles from './shell.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle, themeName } = useTheme();

  const [me, setMe] = useState<{ username: string; roles: string[] } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    api
      .me()
      .then((u) => setMe({ username: u.username, roles: u.roles }))
      .catch(() => {
        clearTokens();
        router.replace('/login');
      });
  }, [router]);

  function logout() {
    clearTokens();
    router.replace('/login');
  }

  return (
    <div className={styles.frame}>
      <header className={styles.topbar}>
        <Link href="/app" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <span className={styles.brandText}>Paperforge</span>
          <span className={styles.brandSub}>DMS</span>
        </Link>

        <div className={styles.topbarRight}>
          <Link href="/app/search" className={styles.navLink}>
            Search
          </Link>
          <Pill>
            Theme: {themeName}{' '}
            <button className={styles.inlineLink} onClick={toggle}>
              switch
            </button>
          </Pill>
          {me && (
            <Pill>
              <span className={styles.user}>{me.username}</span>
              <span className={styles.dot} aria-hidden />
              <span className={styles.roles}>{me.roles.join(', ')}</span>
            </Pill>
          )}
          <Button onClick={logout}>Logout</Button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>Folders</div>
            <div className={styles.sidebarHint}>{pathname?.startsWith('/app/preview') ? 'preview' : 'browse'}</div>
          </div>
          <FolderTree />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
