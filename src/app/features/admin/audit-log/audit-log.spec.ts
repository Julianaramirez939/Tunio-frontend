import { AdminAction } from '../../../core/models';
import { actionDetail, actionLabel } from './audit-log.component';

function action(name: string, details: Record<string, unknown>): AdminAction {
  return {
    id: '1', action: name, occurredAt: '2026-11-05T03:12:00.000Z', sessionId: null, queueItemId: null, details,
    actor: { staffUserId: 's', displayName: 'DJ', role: 'DJ' },
  };
}

describe('bitácora', () => {
  it('traduce las acciones a texto en español', () => {
    expect(actionLabel('BLOCK')).toBe('Bloqueó una canción');
    expect(actionLabel('SKIP')).toBe('Saltó una canción');
  });

  it('una acción desconocida no se oculta', () => {
    expect(actionLabel('FUTURE_ACTION')).toBe('FUTURE_ACTION');
  });

  it('el detalle de un bloqueo lleva la canción y el motivo', () => {
    expect(actionDetail(action('BLOCK', { songTitle: 'Volverte a Ver', reason: 'Letra ofensiva' }))).toBe('«Volverte a Ver» · Motivo: Letra ofensiva');
  });

  it('el detalle de limpiar la cola dice cuántas entradas retiró', () => {
    expect(actionDetail(action('MAINTENANCE_CLEAR', { removedCount: 2 }))).toBe('2 entradas retiradas');
  });
});
