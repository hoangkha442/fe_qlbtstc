export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: '#2455A4',
        ink: '#172b4d',
        muted: '#475569',
        canvas: '#f8f9fa',
        line: '#e5e7eb',
      },
      fontFamily: { sans: ['Segoe UI', 'Arial', 'sans-serif'] },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.5' }],
        sm: ['0.9375rem', { lineHeight: '1.6' }],
      },
    },
  },
  plugins: [],
};
