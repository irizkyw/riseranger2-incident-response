// RISERANGER 2 — Frontend Client Logger with Cyber Themed Badges

const enableLogs = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS !== 'false');

const badgeStyle = (bgColor: string, textColor: string = '#FFFFFF') => 
  `background: ${bgColor}; color: ${textColor}; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-family: monospace;`;

const subBadgeStyle = (bgColor: string, textColor: string = '#FFFFFF') => 
  `background: ${bgColor}; color: ${textColor}; font-weight: 700; font-size: 10px; padding: 2px 5px; border-radius: 3px; font-family: monospace; margin-left: 2px;`;

const textStyle = 'color: #94A3B8; font-family: sans-serif; font-size: 11px;';
const dataStyle = 'color: #00F0FF; font-family: monospace; font-size: 11px;';

const getTimestamp = () => new Date().toLocaleTimeString();

export const clientLogger = {
  api: (method: string, url: string, status: number, durationMs: number, data?: any) => {
    if (!enableLogs) return;
    const statusBg = status >= 200 && status < 300 ? '#059669' : status >= 400 && status < 500 ? '#D97706' : '#DC2626';
    const methodBg = '#0284C7';

    console.groupCollapsed(
      `%cRISERANGER%c${method.toUpperCase()}%c${status}%c ${url} (${durationMs.toFixed(0)}ms) [${getTimestamp()}]`,
      badgeStyle('#0F172A', '#00F0FF'),
      subBadgeStyle(methodBg, '#FFFFFF'),
      subBadgeStyle(statusBg, '#FFFFFF'),
      textStyle
    );
    if (data) {
      console.log('%cResponse Payload:%o', dataStyle, data);
    }
    console.groupEnd();
  },

  socket: (event: string, payload?: any) => {
    if (!enableLogs) return;
    console.log(
      `%cRISERANGER%cWS:%c${event}%c [${getTimestamp()}]`,
      badgeStyle('#0F172A', '#00F0FF'),
      subBadgeStyle('#7C3AED', '#FFFFFF'),
      'color: #A855F7; font-weight: bold; font-family: monospace; margin-left: 4px;',
      textStyle,
      payload !== undefined ? payload : ''
    );
  },

  auth: (action: string, username?: string, meta?: any) => {
    if (!enableLogs) return;
    console.log(
      `%cRISERANGER%cAUTH%c ${action} ${username ? `(@${username})` : ''}`,
      badgeStyle('#0F172A', '#00F0FF'),
      subBadgeStyle('#EC4899', '#FFFFFF'),
      'color: #F472B6; font-weight: bold; margin-left: 4px;',
      meta !== undefined ? meta : ''
    );
  },

  info: (context: string, message: string, meta?: any) => {
    if (!enableLogs) return;
    console.log(
      `%cRISERANGER%c${context}%c ${message}`,
      badgeStyle('#0F172A', '#00F0FF'),
      subBadgeStyle('#334155', '#38BDF8'),
      textStyle,
      meta !== undefined ? meta : ''
    );
  },

  warn: (context: string, message: string, meta?: any) => {
    if (!enableLogs) return;
    console.warn(
      `%cRISERANGER%cWARN:%c${context}%c ${message}`,
      badgeStyle('#0F172A', '#00F0FF'),
      subBadgeStyle('#D97706', '#000000'),
      'color: #FBBF24; font-weight: bold; margin-left: 4px;',
      textStyle,
      meta !== undefined ? meta : ''
    );
  },

  error: (context: string, message: string, error?: any) => {
    console.error(
      `%cRISERANGER%cERR:%c${context}%c ${message}`,
      badgeStyle('#0F172A', '#00F0FF'),
      subBadgeStyle('#DC2626', '#FFFFFF'),
      'color: #F87171; font-weight: bold; margin-left: 4px;',
      textStyle,
      error !== undefined ? error : ''
    );
  }
};

export default clientLogger;
