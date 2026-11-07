import {
  elapsedNow, formatDuration, formatTotalDuration, formatWait, formatWaitPrecise, lastDaysRange, shiftDay, todayInBogota,
} from './format';

describe('formato de duraciones', () => {
  it('formatea una canción como m:ss', () => {
    expect(formatDuration(198)).toBe('3:18');
    expect(formatDuration(5)).toBe('0:05');
  });

  it('pasa a h:mm:ss desde la hora', () => {
    expect(formatDuration(3736)).toBe('1:02:16');
  });

  it('no formatea valores negativos', () => {
    expect(formatDuration(-4)).toBe('0:00');
  });

  it('resume la duración total de una lista', () => {
    expect(formatTotalDuration(3736)).toBe('1 h 2 min');
    expect(formatTotalDuration(7200)).toBe('2 h');
    expect(formatTotalDuration(1500)).toBe('25 min');
  });
});

describe('espera', () => {
  it('muestra «ahora» cuando la canción va a sonar ya', () => {
    expect(formatWait(0)).toBe('ahora');
  });

  it('redondea a minutos y nunca muestra 0 min', () => {
    expect(formatWait(40)).toBe('1 min');
    expect(formatWait(119)).toBe('2 min');
  });

  it('pasa a horas', () => {
    expect(formatWait(3900)).toBe('1 h 5 min');
    expect(formatWait(7200)).toBe('2 h');
  });

  it('da la espera promedio con segundos', () => {
    expect(formatWaitPrecise(220)).toBe('3 min 40 s');
    expect(formatWaitPrecise(45)).toBe('45 s');
  });
});

describe('progreso de la canción', () => {
  it('suma el tiempo local al que informó el servidor', () => {
    expect(elapsedNow(60, 1_000, 200, 11_000)).toBe(70);
  });

  it('no pasa de la duración', () => {
    expect(elapsedNow(195, 0, 198, 60_000)).toBe(198);
  });

  it('ignora un reloj que va hacia atrás', () => {
    expect(elapsedNow(10, 5_000, 200, 1_000)).toBe(10);
  });
});

describe('días de calendario en Bogotá', () => {
  it('a las 22:00 de Bogotá sigue siendo ese día aunque en UTC ya sea el siguiente', () => {
    // 03:00 UTC del 8 de noviembre = 22:00 del 7 en Bogotá (UTC-5).
    expect(todayInBogota(new Date('2026-11-08T03:00:00Z'))).toBe('2026-11-07');
  });

  it('resta días cruzando el cambio de mes', () => {
    expect(shiftDay('2026-11-03', -5)).toBe('2026-10-29');
  });

  it('el rango de los últimos 7 días cuenta hoy', () => {
    expect(lastDaysRange(7, new Date('2026-11-07T15:00:00Z'))).toEqual({ from: '2026-11-01', to: '2026-11-07' });
  });
});
