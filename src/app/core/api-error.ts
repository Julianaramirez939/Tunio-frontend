// Único sitio donde los mensajes del servidor (en inglés) se vuelven texto para el usuario.
// La interfaz nunca muestra `message` crudo.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    /** Texto en español, listo para mostrar. */
    message: string,
    /** Primer mensaje original del servidor; solo para decidir flujos, nunca para mostrarlo. */
    public readonly code: string,
  ) {
    super(message);
  }
}

const EXACT: Record<string, string> = {
  'Invalid credentials': 'Correo o contraseña incorrectos.',
  'Unauthorized': 'Tu sesión venció. Inicia sesión de nuevo.',
  'No access to this venue': 'No tienes acceso a este establecimiento.',
  'Insufficient role for this action': 'Tu rol no permite esta acción.',
  'Venue is not active': 'Este establecimiento está desactivado.',
  'QR access has not been generated yet': 'Este establecimiento aún no tiene código QR.',
  'The venue has no open session': 'El servicio está cerrado: no hay una sesión abierta.',
  'This venue already has an open session': 'Ya hay una sesión abierta en este establecimiento.',
  'Session not found': 'No se encontró la sesión.',
  'Song catalog is unavailable': 'El catálogo de canciones no está disponible ahora. Inténtalo más tarde.',
  'This venue has no default playlist': 'Este establecimiento no tiene lista por defecto.',
  'This song is already in the default playlist': 'Esa canción ya está en la lista por defecto.',
  'This song cannot be played in the venue': 'Esa canción no se puede reproducir en el local (vídeo no embebible, privado o borrado).',
  'Track not found in the default playlist': 'Esa canción ya no está en la lista.',
  'Playback not found': 'No se encontró la reproducción.',
  'Song not found': 'No se encontró la canción.',
  'This song is already blocked in the venue': 'Esa canción ya está bloqueada.',
  'Block not found': 'No se encontró ese bloqueo.',
  'This block is no longer active': 'Ese bloqueo ya no está vigente.',
  'Queue entry not found': 'Esa entrada ya no está en la cola.',
  'genre must be one of the listed genres': 'Elige un género de la lista.',
  'Filter by sessionId or by from/to, not both': 'Filtra por una sesión o por un periodo, no por ambos.',
  'qrToken or accessToken is required': 'Faltan las credenciales de conexión.',
  'venueId is required': 'Falta el establecimiento de la conexión.',
};

const PATTERNS: [RegExp, string][] = [
  [/^Cannot remove a PLAYING entry$/, 'La canción que suena no se retira: sáltala o bloquéala.'],
  [/^Cannot remove a \w+ entry$/, 'Esa entrada ya salió de la cola.'],
  [/^Cannot change a \w+ session to \w+$/, 'Ese cambio no es posible en el estado actual de la sesión.'],
  [/^(from|to) must be a date/, 'Las fechas deben tener el formato AAAA-MM-DD.'],
];

const BY_STATUS: Record<number, string> = {
  0: 'No hay conexión con el servidor. Comprueba que esté encendido.',
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión venció. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No se encontró lo que buscabas.',
  409: 'La acción no se pudo completar por el estado actual.',
  422: 'El servidor no pudo procesar los datos enviados.',
  429: 'Demasiadas solicitudes seguidas. Espera un momento.',
  503: 'El servicio no está disponible ahora. Inténtalo más tarde.',
};

/** Traduce un mensaje conocido del servidor; devuelve null si no lo reconoce. */
export function translateMessage(message: string): string | null {
  if (EXACT[message]) return EXACT[message];
  return PATTERNS.find(([regex]) => regex.test(message))?.[1] ?? null;
}

export function translateError(status: number, message: string | string[] | undefined): ApiError {
  const messages = Array.isArray(message) ? message : message ? [message] : [];
  const translated = [...new Set(messages.map(translateMessage).filter((m): m is string => !!m))];
  const text = translated.length
    ? translated.join(' ')
    : (BY_STATUS[status] ?? (status >= 500 ? 'Error del servidor. Inténtalo de nuevo.' : 'No se pudo completar la acción.'));
  return new ApiError(status, text, messages[0] ?? '');
}
