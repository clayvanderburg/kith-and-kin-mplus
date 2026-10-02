/**
 * The weekly M+ night: which day, what time, which time zone, who hosts.
 * Officers edit it in the Control Center ("Weekly night" card); it's stored as state.eventSettings.
 * Shared by the Discord card (bot/embeds.js), the Friday jobs (lib/jobs.js) and the pages.
 */
const DEFAULT_SETTINGS = {
  weekday: 5,                    // 0 = Sunday ... 5 = Friday
  time: '19:30',                 // 24h wall-clock time in timeZone
  timeZone: 'America/Chicago',   // Central
  host: '',                      // shown on the Discord card when set
  title: 'Friday Mythic+ Night'
};
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_ZONES = {
  'America/New_York': 'Eastern', 'America/Chicago': 'Central', 'America/Denver': 'Mountain',
  'America/Phoenix': 'Arizona', 'America/Los_Angeles': 'Pacific', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii'
};

/** Clean up whatever was stored/sent; unknown or bad values fall back to the defaults. */
function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const weekday = Number.isInteger(Number(s.weekday)) && Number(s.weekday) >= 0 && Number(s.weekday) <= 6 ? Number(s.weekday) : DEFAULT_SETTINGS.weekday;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.time || '')) ? String(s.time) : DEFAULT_SETTINGS.time;
  const timeZone = TIME_ZONES[s.timeZone] ? s.timeZone : DEFAULT_SETTINGS.timeZone;
  const host = String(s.host ?? DEFAULT_SETTINGS.host).trim().slice(0, 40);
  const title = String(s.title || DEFAULT_SETTINGS.title).trim().slice(0, 60) || DEFAULT_SETTINGS.title;
  return { weekday, time, timeZone, host, title };
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
  }).formatToParts(date).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return {
    year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour, minute: +parts.minute, second: +parts.second,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  };
}

// UTC ms for a wall-clock time in timeZone (handles daylight saving).
function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const p = zonedParts(new Date(guess), timeZone);
  return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess);
}

function kickoffOn(settings, year, month, day) {
  const [h, m] = settings.time.split(':').map(Number);
  return zonedToUtc(year, month, day, h, m, settings.timeZone);
}

/**
 * The night `now` belongs to: from 2 hours before kickoff until 9 hours after.
 * Returns { start, end, kickoff, dateKey } or null. With `latest`, also returns the most recent
 * finished night.
 */
function nightWindow(rawSettings, now = new Date(), { latest = false } = {}) {
  const settings = normalizeSettings(rawSettings);
  const today = zonedParts(now, settings.timeZone);
  const since = (today.weekday - settings.weekday + 7) % 7;
  for (const back of [since, since + 7]) {
    const kickoff = kickoffOn(settings, today.year, today.month, today.day - back);
    const start = kickoff - 2 * 3600e3;
    const end = kickoff + 9 * 3600e3;
    const t = now.getTime();
    if ((t >= start && t <= end) || (latest && t > end)) {
      const k = zonedParts(new Date(kickoff), settings.timeZone);
      const dateKey = `${k.year}-${String(k.month).padStart(2, '0')}-${String(k.day).padStart(2, '0')}`;
      return { start, end, kickoff, dateKey };
    }
  }
  return null;
}

/** Next kickoff (ms). Keeps showing tonight's until 4 hours after it started. */
function nextKickoff(rawSettings, now = new Date()) {
  const settings = normalizeSettings(rawSettings);
  const today = zonedParts(now, settings.timeZone);
  const days = (settings.weekday - today.weekday + 7) % 7;
  let target = kickoffOn(settings, today.year, today.month, today.day + days);
  if (now.getTime() > target + 4 * 3600e3) target = kickoffOn(settings, today.year, today.month, today.day + days + 7);
  return target;
}

/** "Friday 7:30 PM Central" */
function describe(rawSettings) {
  const s = normalizeSettings(rawSettings);
  const [h, m] = s.time.split(':').map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${DAYS[s.weekday]} ${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} ${TIME_ZONES[s.timeZone]}`;
}

const api = { DEFAULT_SETTINGS, DAYS, TIME_ZONES, normalizeSettings, nightWindow, nextKickoff, describe, zonedParts };
// Works in Node (functions) and in the browser (Control Center loads it as /bot/schedule.js).
if (typeof module === 'object' && module.exports) module.exports = api;
else if (typeof window !== 'undefined') window.KKSchedule = api;
