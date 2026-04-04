import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens APEX
        'apex-dark': '#0A0E1A',
        'apex-surface': '#1C2333',
        'apex-surface-2': '#252D3E',
        'apex-border': 'rgba(255,255,255,0.08)',
        'apex-primary': '#1A6BFF',
        'apex-secondary': '#00C9A7',
        'apex-accent': '#FF6B35',
        'apex-text': '#F8FAFF',
        'apex-text-muted': '#8B9CC8',
        // Couleurs sémantiques
        'apex-error': '#FF4D4D',
        'apex-warning': '#FFB020',
        'apex-success': '#00C9A7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'apex-gradient': 'linear-gradient(135deg, #1A6BFF 0%, #00C9A7 100%)',
        'apex-gradient-dark': 'linear-gradient(135deg, #0D3D99 0%, #007A65 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'apex-glow': '0 0 40px rgba(26, 107, 255, 0.15)',
        'apex-card': '0 4px 24px rgba(0,0,0,0.4)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'waveform 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        waveform: {
          '0%': { transform: 'scaleY(0.3)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      borderRadius: {
        'apex': '12px',
        'apex-lg': '16px',
        'apex-xl': '24px',
      },
    },
  },
  plugins: [],
}

export default config
