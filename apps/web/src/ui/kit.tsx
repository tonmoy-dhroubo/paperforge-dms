import styles from './kit.module.css';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Panel(props: { title?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.panel}>
      {(props.title || props.right) && (
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>{props.title}</div>
          <div>{props.right}</div>
        </div>
      )}
      <div className={styles.panelBody}>{props.children}</div>
    </div>
  );
}

export function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type={props.type || 'button'}
      className={cn(
        styles.button,
        props.variant === 'accent' && styles.buttonAccent,
        props.variant === 'danger' && styles.buttonDanger,
      )}
      onClick={props.onClick}
      disabled={props.disabled}
      style={props.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
    >
      {props.children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(styles.input, props.className)} />;
}

export function Hint(props: { children: React.ReactNode }) {
  return <div className={styles.hint}>{props.children}</div>;
}

export function Pill(props: { children: React.ReactNode }) {
  return <span className={styles.pill}>{props.children}</span>;
}

export function Kbd(props: { children: React.ReactNode }) {
  return <span className={styles.kbd}>{props.children}</span>;
}

