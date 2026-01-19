export type PaperforgeTheme = {
  name: string;
  fonts: {
    body: string;
    display: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
  };
  colors: {
    bg: string;
    bgElev: string;
    bgElev2: string;
    border: string;
    borderStrong: string;
    text: string;
    textDim: string;
    textFaint: string;
    accent: string;
    accent2: string;
    danger: string;
  };
  shadows: {
    base: string;
    soft: string;
  };
};

export const paperforgeThemes: Record<'noir' | 'paper', PaperforgeTheme> = {
  noir: {
    name: 'Noir Ledger',
    fonts: {
      body: 'var(--pf-next-font-body)',
      display: 'var(--pf-next-font-display)',
    },
    radii: { sm: '10px', md: '16px', lg: '22px' },
    colors: {
      bg: '#0e1114',
      bgElev: 'rgba(255, 255, 255, 0.04)',
      bgElev2: 'rgba(255, 255, 255, 0.07)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      text: 'rgba(255, 255, 255, 0.92)',
      textDim: 'rgba(255, 255, 255, 0.62)',
      textFaint: 'rgba(255, 255, 255, 0.42)',
      accent: '#55d6c2',
      accent2: '#f4d06f',
      danger: '#ff5b5b',
    },
    shadows: {
      base: '0 16px 55px rgba(0, 0, 0, 0.45)',
      soft: '0 10px 30px rgba(0, 0, 0, 0.28)',
    },
  },
  paper: {
    name: 'Paper Archive',
    fonts: {
      body: 'var(--pf-next-font-body)',
      display: 'var(--pf-next-font-display)',
    },
    radii: { sm: '10px', md: '16px', lg: '22px' },
    colors: {
      bg: '#f7f1e7',
      bgElev: 'rgba(0, 0, 0, 0.03)',
      bgElev2: 'rgba(0, 0, 0, 0.06)',
      border: 'rgba(0, 0, 0, 0.10)',
      borderStrong: 'rgba(0, 0, 0, 0.18)',
      text: 'rgba(12, 14, 18, 0.92)',
      textDim: 'rgba(12, 14, 18, 0.62)',
      textFaint: 'rgba(12, 14, 18, 0.42)',
      accent: '#0aa39a',
      accent2: '#b65d2b',
      danger: '#c62828',
    },
    shadows: {
      base: '0 18px 45px rgba(20, 10, 0, 0.12)',
      soft: '0 10px 25px rgba(20, 10, 0, 0.10)',
    },
  },
};

export function themeToCssVars(theme: PaperforgeTheme) {
  return {
    '--pf-font-body': theme.fonts.body,
    '--pf-font-display': theme.fonts.display,
    '--pf-radius-sm': theme.radii.sm,
    '--pf-radius-md': theme.radii.md,
    '--pf-radius-lg': theme.radii.lg,
    '--pf-bg': theme.colors.bg,
    '--pf-bg-elev': theme.colors.bgElev,
    '--pf-bg-elev-2': theme.colors.bgElev2,
    '--pf-border': theme.colors.border,
    '--pf-border-strong': theme.colors.borderStrong,
    '--pf-text': theme.colors.text,
    '--pf-text-dim': theme.colors.textDim,
    '--pf-text-faint': theme.colors.textFaint,
    '--pf-accent': theme.colors.accent,
    '--pf-accent-2': theme.colors.accent2,
    '--pf-danger': theme.colors.danger,
    '--pf-shadow': theme.shadows.base,
    '--pf-shadow-soft': theme.shadows.soft,
  } as const;
}

