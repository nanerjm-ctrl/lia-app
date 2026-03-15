// ============================================================
// TEMA MATERIAL 3 - LIA App
// Paleta suave e acessível para idosos
// ============================================================

export const Colors = {
  // Cores primárias - Azul suave/índigo
  primary: '#5B67CA',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DEE1FF',
  onPrimaryContainer: '#0A1478',

  // Cores secundárias - Verde suave
  secondary: '#5B8C6E',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#BDEECF',
  onSecondaryContainer: '#072B18',

  // Cores terciárias - Rosa suave
  tertiary: '#C47B8A',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD9E2',
  onTertiaryContainer: '#3E0719',

  // Erros
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Superfícies
  background: '#F8F9FE',
  onBackground: '#1A1C25',
  surface: '#FFFFFF',
  onSurface: '#1A1C25',
  surfaceVariant: '#E4E1EC',
  onSurfaceVariant: '#46464F',

  // Contornos
  outline: '#767680',
  outlineVariant: '#C7C5D0',

  // Inverso
  inverseSurface: '#2F3038',
  inverseOnSurface: '#F2EFF7',
  inversePrimary: '#BAC3FF',

  // Scrim / Sombra
  scrim: '#000000',

  // Cores de alerta / informação
  warning: '#F59E0B',
  warningContainer: '#FEF3C7',
  success: '#059669',
  successContainer: '#D1FAE5',
  info: '#3B82F6',
  infoContainer: '#DBEAFE',

  // Elevações
  elevation0: '#FFFFFF',
  elevation1: '#F0EEFB',
  elevation2: '#EAE8F8',
  elevation3: '#E4E1F4',

  // Gradientes
  gradientPrimary: ['#5B67CA', '#7B8FE0'],
  gradientSecondary: ['#5B8C6E', '#7AB090'],
  gradientBackground: ['#EEF2FF', '#F8F9FE'],
};

export const Typography = {
  // Display
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400', letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: '400', letterSpacing: 0 },
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: '400', letterSpacing: 0 },

  // Headline
  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '400', letterSpacing: 0 },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400', letterSpacing: 0 },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '400', letterSpacing: 0 },

  // Title
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '500', letterSpacing: 0 },
  titleMedium: { fontSize: 18, lineHeight: 24, fontWeight: '500', letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },

  // Body
  bodyLarge: { fontSize: 18, lineHeight: 26, fontWeight: '400', letterSpacing: 0.5 },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.25 },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.4 },

  // Label
  labelLarge: { fontSize: 16, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
  labelMedium: { fontSize: 14, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 9999,
};

export const Elevation = {
  level0: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
};

export default { Colors, Typography, Spacing, BorderRadius, Elevation };
