export interface ColorTheme {
  primary: string;
  primaryHover: string;
  lightSage: string;
  veryLightSage: string;
  mintAccent: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  cardBg: string;
  white: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export const lightColors: ColorTheme = {
  primary: '#6FAF8F',
  primaryHover: '#5C9C7D',
  lightSage: '#A8D5BA',
  veryLightSage: '#EAF7EF',
  mintAccent: '#CDEDD8',
  success: '#43A047',
  warning: '#F9A825',
  error: '#E53935',
  background: '#F8FAF8',
  cardBg: '#FFFFFF',
  white: '#FFFFFF',
  border: '#E7ECE9',
  textPrimary: '#2D3748',
  textSecondary: '#718096',
  textMuted: '#A0AEC0',
};

export const darkColors: ColorTheme = {
  primary: '#6FAF8F',
  primaryHover: '#7DC89E',
  lightSage: '#4A7A5E',
  veryLightSage: '#1A2E22',
  mintAccent: '#1E3528',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#EF5350',
  background: '#0E1A13',
  cardBg: '#131F18',
  white: '#131F18',
  border: '#253A2D',
  textPrimary: '#E4EDE8',
  textSecondary: '#8BAA97',
  textMuted: '#4D7060',
};

export function getColors(darkMode: boolean): ColorTheme {
  return darkMode ? darkColors : lightColors;
}

export function getShadows(darkMode: boolean) {
  if (darkMode) {
    return {
      card: '0px 8px 30px rgba(0,0,0,0.3)',
      hover: '0px 14px 40px rgba(0,0,0,0.4)',
      modal: '0px 20px 60px rgba(0,0,0,0.5)',
    };
  }
  return {
    card: '0px 8px 30px rgba(0,0,0,0.06)',
    hover: '0px 14px 40px rgba(0,0,0,0.08)',
    modal: '0px 20px 60px rgba(0,0,0,0.12)',
  };
}

// Legacy exports for backward compatibility
export const colors = lightColors;
export const shadows = getShadows(false);
