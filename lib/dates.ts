const TZ = 'America/Bogota';

export function formatDateCO(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' }
): string {
  return new Date(date).toLocaleDateString('es-CO', { timeZone: TZ, ...opts });
}

export function formatDateTimeCO(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
