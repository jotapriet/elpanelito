import { EXTRA_PANELS } from './panels.js';
import { LAUNCH_DAY, panelDay } from './schedule.js';
export const MAX_LIVES = 5;
export const PANELS = [
 ['Cine','LA VIDA ES BELLA'], ['Refranes','NO HAY MAL QUE POR BIEN NO VENGA'],
 ['Ciencia','LA ENERGÍA NI SE CREA NI SE DESTRUYE'], ['Literatura','EN UN LUGAR DE LA MANCHA'],
 ['Música','QUE LA MÚSICA NO PARE'], ['Geografía','TODOS LOS CAMINOS LLEVAN A ROMA'],
 ['Historia','UN PEQUEÑO PASO PARA EL HOMBRE'], ['Cine','QUE LA FUERZA TE ACOMPAÑE'],
 ['Refranes','A QUIEN MADRUGA DIOS LE AYUDA'], ['Naturaleza','LA PRIMAVERA LA SANGRE ALTERA'],
 ['Literatura','LO ESENCIAL ES INVISIBLE A LOS OJOS'], ['Ciencia','LA TIERRA GIRA ALREDEDOR DEL SOL'],
 ['Cine','HASTA EL INFINITO Y MÁS ALLÁ'], ['Refranes','MÁS VALE TARDE QUE NUNCA'],
 ['Gastronomía','A NADIE LE AMARGA UN DULCE'], ['Historia','TODOS LOS HOMBRES NACEN LIBRES'],
 ['Música','LA VIDA ES UN CARNAVAL'], ['Refranes','EN ABRIL AGUAS MIL'],
 ['Cine','SIEMPRE NOS QUEDARÁ PARÍS'], ['Literatura','ÉRASE UNA VEZ UN PRINCIPITO'],
 ['Ciencia','EL ORIGEN DE LAS ESPECIES'], ['Geografía','LA CIUDAD QUE NUNCA DUERME'],
 ['Refranes','AL MAL TIEMPO BUENA CARA'], ['Cine','MI CASA TELÉFONO'],
 ['Naturaleza','DESPUÉS DE LA TORMENTA LLEGA LA CALMA'], ['Literatura','SUEÑA EL REY QUE ES REY'],
 ['Música','HOY PUEDE SER UN GRAN DÍA'], ['Refranes','QUIEN TIENE UN AMIGO TIENE UN TESORO'],
 ['Historia','EL SABER NO OCUPA LUGAR'], ['Cine','ELEMENTAL MI QUERIDO WATSON'],
 ...EXTRA_PANELS,
];
export const dayKey = panelDay;
export function dailyPanel(key) {
 const [y,m,d] = key.split('-').map(Number);
 const number = Math.max(1,Math.floor((Date.UTC(y,m-1,d)-Date.parse(`${LAUNCH_DAY}T00:00:00Z`))/86400000)+1);
 const [category,phrase] = PANELS[((number-1)%PANELS.length+PANELS.length)%PANELS.length];
 return {number, category, phrase};
}
// Preserve Ñ as a distinct Spanish letter; ignore other diacritics.
export const normalize = value => value.toUpperCase().replaceAll('Ñ','\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('\u0001','Ñ');
export const solution = value => normalize(value).replace(/[^A-ZÑ0-9]/g,'');
export const isLetter = char => /^[A-ZÑ]$/.test(normalize(char));
export const elapsed = (game, now=Date.now()) => game.startedAt ? Math.max(0,Math.floor(((game.endedAt ?? now)-game.startedAt)/1000)) : 0;
export const score = game => Math.max(0,game.lives*200-elapsed(game)*3-game.wrong*50);
export const freshGame = () => ({guessed:[],history:[],lives:MAX_LIVES,wrong:0,startedAt:null,endedAt:null,status:'playing',nickname:null});
export function guess(game,letter,phrase,now=Date.now()) {
 letter=normalize(letter);
 if(game.status!=='playing'||!isLetter(letter)||game.guessed.includes(letter)) return game;
 const hit=normalize(phrase).includes(letter);
 const history=game.history??game.guessed.map(c=>normalize(phrase).includes(c)?'hit':'miss');
 const next={...game,history:[...history,hit?'hit':'miss'],startedAt:game.startedAt??now,guessed:[...game.guessed,letter],lives:Math.max(0,game.lives-(hit?0:1)),wrong:game.wrong+(hit?0:1)};
 const won=[...phrase].filter(isLetter).every(c=>next.guessed.includes(normalize(c)));
 return finish(next,won,now);
}
function finish(game,won,now) { return won||game.lives===0 ? {...game,status:won?'won':'lost',endedAt:now} : game; }
export function resolve(game,answer,phrase,now=Date.now()) {
 if(game.status!=='playing'||!solution(answer)) return game;
 const won=solution(answer)===solution(phrase);
 const history=game.history??game.guessed.map(c=>normalize(phrase).includes(c)?'hit':'miss');
 return finish({...game,history:[...history,won?'solved':'solve-miss'],startedAt:game.startedAt??now,lives:Math.max(0,game.lives-(won?0:2))},won,now);
}
export function readLocal(key,fallback) { try { return JSON.parse(localStorage.getItem(key))??fallback; } catch { return fallback; } }
export function writeLocal(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { return false; } }
