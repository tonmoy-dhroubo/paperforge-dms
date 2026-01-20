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
    grid: string;
    gridStrong: string;
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
    name: 'Swiss Night',
    fonts: {
      body: 'var(--pf-next-font-body)',
      display: 'var(--pf-next-font-display)',
    },
    radii: { sm: '4px', md: '8px', lg: '12px' },
    colors: {
      bg: '#0c0d0e',
      bgElev: 'rgba(255, 255, 255, 0.03)',
      bgElev2: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderStrong: 'rgba(255, 255, 255, 0.20)',
      grid: 'rgba(255, 255, 255, 0.04)',
      gridStrong: 'rgba(255, 255, 255, 0.08)',
      text: 'rgba(245, 245, 242, 0.96)',
      textDim: 'rgba(245, 245, 242, 0.64)',
      textFaint: 'rgba(245, 245, 242, 0.44)',
      accent: '#e10600',
      accent2: '#c9c9c3',
      danger: '#ff4d4d',
    },
    shadows: {
      base: '0 1px 0 rgba(255, 255, 255, 0.06)',
      soft: '0 12px 24px rgba(0, 0, 0, 0.35)',
    },
  },
  paper: {
    name: 'Swiss Daylight',
    fonts: {
      body: 'var(--pf-next-font-body)',
      display: 'var(--pf-next-font-display)',
    },
    radii: { sm: '4px', md: '8px', lg: '12px' },
    colors: {
      bg: '#f6f5f2',
      bgElev: 'rgba(14, 15, 17, 0.03)',
      bgElev2: 'rgba(14, 15, 17, 0.06)',
      border: 'rgba(14, 15, 17, 0.10)',
      borderStrong: 'rgba(14, 15, 17, 0.22)',
      grid: 'rgba(14, 15, 17, 0.04)',
      gridStrong: 'rgba(14, 15, 17, 0.10)',
      text: 'rgba(13, 14, 16, 0.96)',
      textDim: 'rgba(13, 14, 16, 0.64)',
      textFaint: 'rgba(13, 14, 16, 0.42)',
      accent: '#d0021b',
      accent2: '#111111',
      danger: '#c62828',
    },
    shadows: {
      base: '0 1px 0 rgba(0, 0, 0, 0.08)',
      soft: '0 14px 28px rgba(15, 15, 15, 0.12)',
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
    '--pf-grid': theme.colors.grid,
    '--pf-grid-strong': theme.colors.gridStrong,
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
