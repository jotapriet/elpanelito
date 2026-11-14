export const TIME_ZONE = 'Europe/Madrid';
export const LAUNCH_DAY = '2026-11-12';
export const LAUNCH_AT = Date.parse('2026-11-12T07:00:00+01:00');
const formatter = new Intl.DateTimeFormat('en-GB', {
 timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
 hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function madridParts(date) {
 return Object.fromEntries(formatter.formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
}
const isoDay = time => new Date(time).toISOString().slice(0,10);
// A game day starts at 07:00 in Madrid, including daylight saving changes.
export function panelDay(date = new Date()) {
 const {year,month,day,hour}=madridParts(date);
 return isoDay(Date.UTC(year,month-1,day-(hour<7?1:0)));
}
export function nextPanelAt(date = new Date()) {
 const {year,month,day,hour}=madridParts(date);
 const target=Date.UTC(year,month-1,day+(hour>=7?1:0),7);
 const parts=madridParts(new Date(target));
 const offset=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-target;
 return target-offset;
}
export function launchCountdown(now = Date.now(),launchAt=LAUNCH_AT) {
 const total=Math.max(0,Math.ceil((launchAt-now)/1000));
 return [Math.floor(total/86400),Math.floor(total/3600)%24,Math.floor(total/60)%60,total%60];
}
export const hasLaunched = (now = Date.now()) => now >= LAUNCH_AT;
