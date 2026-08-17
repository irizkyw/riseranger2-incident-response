/**
 * Standard Indonesian Western Time (WIB - Asia/Jakarta UTC+7) formatting utilities.
 */

export const formatWIBTime = (dateInput: string | number | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + ' WIB';
};

export const formatWIBDate = (dateInput: string | number | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatWIBDateTime = (dateInput: string | number | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return `${formatWIBDate(d)}, ${formatWIBTime(d)}`;
};
