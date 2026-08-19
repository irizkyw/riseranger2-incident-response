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

/**
 * Convert any Date or ISO timestamp to "YYYY-MM-DDTHH:mm" in WIB (Asia/Jakarta UTC+7)
 * for HTML5 <input type="datetime-local">.
 */
export const toWIBInputString = (dateInput: string | number | Date | null | undefined): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value || '1970';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  let hour = parts.find(p => p.type === 'hour')?.value || '00';
  if (hour === '24') hour = '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

/**
 * Convert user input from <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * assumed in WIB (UTC+7) into a standard ISO string in UTC ("YYYY-MM-DDTHH:mm:ss.sssZ").
 */
export const fromWIBInputString = (inputStr: string | null | undefined): string | null => {
  if (!inputStr) return null;
  const trimmed = inputStr.trim();
  if (!trimmed) return null;

  if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const hasSeconds = trimmed.split(':').length === 3;
    const withSeconds = hasSeconds ? trimmed : `${trimmed}:00`;
    const d = new Date(`${withSeconds}+07:00`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
