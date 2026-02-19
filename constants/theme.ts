// Rudder design system
// Dark-first, high-contrast, built for outdoor readability

export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0A0A0F',    // near-black, main surface
    secondary: '#13131A',  // card surfaces
    tertiary: '#1C1C28',   // elevated elements
    overlay: 'rgba(10,10,15,0.85)',
  },

  // Brand
  brand: {
    primary: '#2D7DD2',    // Rudder blue — water, trust
    secondary: '#1A5FA0',  // deeper blue for pressed states
    accent: '#48B5D4',     // lighter cyan for highlights
  },

  // Status (check-in system)
  status: {
    ahead: '#34C759',      // green — Apple system green
    onTarget: '#2D7DD2',   // blue
    behind: '#FF9500',     // orange — not red, not alarming
  },

  // Training phases
  phase: {
    base: '#5E5CE6',       // purple
    build: '#2D7DD2',      // blue
    specific: '#34C759',   // green
    taper: '#FF9F0A',      // amber
  },

  // Effort bands
  effort: {
    easy: '#34C759',
    aerobic: '#2D7DD2',
    threshold: '#FF9500',
    speed: '#FF3B30',
  },

  // Text
  text: {
    primary: '#F2F2F7',
    secondary: '#8E8E93',
    tertiary: '#48484A',
    inverse: '#0A0A0F',
  },

  // Borders
  border: {
    subtle: '#2C2C3E',
    default: '#3A3A52',
    strong: '#5A5A7A',
  },

  // Semantic
  error: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
};

export const Typography = {
  // Font sizes (sp)
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  '5xl': 42,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Spacing = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
};
