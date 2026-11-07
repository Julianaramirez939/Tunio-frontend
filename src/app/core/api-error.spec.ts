import { translateError, translateMessage } from './api-error';

describe('traducción de errores del servidor', () => {
  it('traduce un mensaje conocido', () => {
    expect(translateError(409, 'The venue has no open session').message).toBe('El servicio está cerrado: no hay una sesión abierta.');
  });

  it('conserva el mensaje original en `code` para decidir flujos, sin mostrarlo', () => {
    const error = translateError(409, 'The venue has no open session');
    expect(error.code).toBe('The venue has no open session');
    expect(error.message).not.toContain('venue');
  });

  it('traduce los mensajes con parte variable', () => {
    expect(translateMessage('Cannot change a PAUSED session to PAUSED')).toContain('estado actual de la sesión');
    expect(translateMessage('Cannot remove a PLAYING entry')).toContain('sáltala o bloquéala');
    expect(translateMessage('Cannot remove a REMOVED entry')).toContain('ya salió de la cola');
  });

  it('une y repite una sola vez los mensajes de una lista de validación (400)', () => {
    const error = translateError(400, ['from must be a date (YYYY-MM-DD)', 'to must be a date (YYYY-MM-DD)']);
    expect(error.message).toBe('Las fechas deben tener el formato AAAA-MM-DD.');
  });

  it('nunca muestra texto crudo desconocido: cae al mensaje por código', () => {
    const error = translateError(400, ['name should not be empty']);
    expect(error.message).toBe('Los datos enviados no son válidos.');
    expect(error.message).not.toContain('name');
  });

  it('distingue la falta de conexión', () => {
    expect(translateError(0, undefined).message).toContain('No hay conexión');
  });

  it('trata cualquier 5xx como error del servidor', () => {
    expect(translateError(500, 'Internal server error').message).toBe('Error del servidor. Inténtalo de nuevo.');
  });
});
