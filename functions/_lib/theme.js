// The palette, in the one place the server needs it (the OG image).
// src/styles.css holds the same values as CSS custom properties for the app.
// If you change one, change the other.

export const theme = {
  ground: '#FFFBF6',
  panel: '#FFFFFF',
  border: '#F1E8F7',
  ink: '#2E2140',
  muted: '#5F5273',
  faint: '#A79CB8',
  orange: '#FF6B35',
  purple: '#B57BE8',
  gold: '#C9A227',
  goldTint: '#FFF8E3',
  goldInk: '#9A7A10',
  // The same wash as the in-app share card, so the unfurled preview and the
  // screenshot somebody takes are recognisably the same object.
  wash: 'linear-gradient(135deg, #FF9A4D 0%, #FF6B35 45%, #B57BE8 100%)',
  onWash: '#FFFFFF',
  onWashMuted: 'rgba(255,255,255,0.88)',
}
