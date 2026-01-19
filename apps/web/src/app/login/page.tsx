'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import { Button, Hint, Input, Kbd, Panel, Pill } from '@/ui/kit';
import { useTheme } from '@/design/theme-provider';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { toggle, themeName } = useTheme();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => usernameOrEmail.trim().length > 0 && password.length >= 8 && !busy,
    [usernameOrEmail, password, busy],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.login({ usernameOrEmail: usernameOrEmail.trim(), password });
      setTokens({ token: res.token, refreshToken: res.refreshToken });
      router.replace('/app');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden>
            <span className={styles.markDot} />
            <span className={styles.markLine} />
          </div>
          <div>
            <div className={styles.title}>Paperforge</div>
            <div className={styles.subtitle}>DMS — phase‑1</div>
          </div>
        </div>

        <div className={styles.meta}>
          <Pill>
            Theme: {themeName} · <button className={styles.inlineLink} onClick={toggle}>switch</button>
          </Pill>
          <Pill>
            Tip: press <Kbd>⌘</Kbd> <Kbd>L</Kbd> to focus the address bar
          </Pill>
        </div>
      </div>

      <div className={styles.card}>
        <Panel
          title="Sign in"
          right={
            <span className={styles.rightHint}>
              local dev · <span className={styles.mono}>/api/pf</span>
            </span>
          }
        >
          <form onSubmit={onSubmit} className={styles.form}>
            <label className={styles.label}>
              <span>Username or email</span>
              <Input value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} autoFocus />
            </label>

            <label className={styles.label}>
              <span>Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 8 chars"
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <Button type="submit" variant="accent" disabled={!canSubmit}>
                Enter the archive
              </Button>
              <Hint>
                First registration can bootstrap <span className={styles.mono}>ADMIN</span> (see <span className={styles.mono}>AUTH_FIRST_USER_ADMIN</span>).
              </Hint>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

