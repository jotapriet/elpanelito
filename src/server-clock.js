// performance.now is monotonic: changing the device calendar cannot move this clock.
export function serverClock(serverNow,receivedAt=performance.now()) {
 return (tick=performance.now())=>serverNow+Math.max(0,tick-receivedAt);
}
