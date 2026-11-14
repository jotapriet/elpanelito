// Day keys represent the Madrid game day (07:00 to 07:00), not device midnight.
const dayNumber=day=>Math.floor(Date.parse(`${day}T00:00:00Z`)/86400000);
export function summarizeStatistics(results=[],today) {
 const completed=results.filter(result=>result&&['won','lost'].includes(result.status)&&Number.isFinite(dayNumber(result.day))&&result.day<=today);
 const played=completed.length;
 const wins=completed.filter(result=>result.status==='won').length;
 const days=[...new Set(completed.map(result=>dayNumber(result.day)))].sort((a,b)=>b-a);
 let streak=0;
 // Yesterday's streak stays active while today's panel can still be played.
 if(days.length&&dayNumber(today)-days[0]<=1){
  streak=1;
  for(let i=1;i<days.length&&days[i]===days[i-1]-1;i++)streak++;
 }
 return {
  played,wins,winRate:played?Math.round(wins/played*100):0,
  bestScore:completed.reduce((best,result)=>Math.max(best,Number.isFinite(result.points)?result.points:0),0),
  streak,
 };
}
