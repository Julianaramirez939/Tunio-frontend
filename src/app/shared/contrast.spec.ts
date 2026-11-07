// Verificación de contraste de la pantalla del bar (WEB-13): lee los colores reales de styles.css.

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Relación de contraste WCAG 2.x entre dos colores. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('contraste de la paleta', () => {
  const AAA = 7; // la pantalla del bar se lee a cinco metros y en penumbra
  const AA = 4.5;

  it('lee los tokens de styles.css', () => {
    expect(token('--bg')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  for (const surface of ['--bg', '--surface', '--surface-2']) {
    it(`el texto principal y el atenuado cumplen AAA sobre ${surface}`, () => {
      expect(contrast(token('--text'), token(surface))).toBeGreaterThanOrEqual(AAA);
      expect(contrast(token('--muted'), token(surface))).toBeGreaterThanOrEqual(AAA);
    });

    it(`los acentos (lila, ámbar, verde, rojo) cumplen AAA sobre ${surface}`, () => {
      for (const accent of ['--primary', '--accent', '--ok', '--danger']) {
        expect(contrast(token(accent), token(surface))).withContext(`${accent} sobre ${surface}`).toBeGreaterThanOrEqual(AAA);
      }
    });
  }

  it('el texto de los botones y las insignias cumple AA sobre su fondo', () => {
    expect(contrast(token('--on-primary'), token('--primary'))).toBeGreaterThanOrEqual(AA);
    expect(contrast(token('--bg'), token('--accent'))).toBeGreaterThanOrEqual(AA);
    expect(contrast(token('--bg'), token('--ok'))).toBeGreaterThanOrEqual(AA);
    expect(contrast(token('--bg'), token('--danger'))).toBeGreaterThanOrEqual(AA);
    expect(contrast(token('--text'), token('--line-strong'))).toBeGreaterThanOrEqual(AA);
  });
});
