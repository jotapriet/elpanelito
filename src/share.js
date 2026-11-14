import {elapsed,score,MAX_LIVES,normalize} from './game.js';
const emojis={hit:'🟩',miss:'⬛','solve-miss':'🟥',solved:'🏆'};
export function shareResult({game,panel,streak,url}) {
 const seconds=elapsed(game);
 // Older saved games contain letter order only; don't invent resolution attempts.
 const history=game.history??game.guessed.map(letter=>normalize(panel.phrase).includes(letter)?'hit':'miss');
 const sequence=history.map(action=>emojis[action]??'').join('');
 return [
  `🧩 ElPanelito #${panel.number} - ${panel.category}`,
  game.status==='won'?'✅ Panel resuelto':'❌ Panel sin resolver',
  ...(sequence?[sequence]:[]),
  `⏱️ ${Math.floor(seconds/60)}m ${seconds%60}s | ❤️ ${game.lives}/${MAX_LIVES} vidas`,
  `🏆 Puntuación: ${score(game)} pts`,
  `🔥 Racha: ${streak} ${streak===1?'día':'días'}`,
  `🔗 ¡Juega hoy en: ${url}!`,
 ].join('\n');
}
