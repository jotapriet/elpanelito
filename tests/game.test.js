import test from 'node:test';
import assert from 'node:assert/strict';
import {PANELS,freshGame,guess,resolve,score,elapsed,normalize,solution,dailyPanel,dayKey} from '../src/game.js';
test('aciertos, repeticiones, tildes y Ñ',()=>{
 let game=guess(freshGame(),'a','MAÑANA',1000);
 assert.deepEqual(game.guessed,['A']);assert.equal(game.lives,5);
 assert.equal(guess(game,'a','MAÑANA',2000),game);
 assert.equal(normalize('áéíóúüñ'),'AEIOUUÑ');
 game=guess(game,'n','MAÑANA',2000);assert.equal(game.lives,5);
 game=guess(game,'x','MAÑANA',3000);assert.equal(game.lives,4);assert.equal(game.wrong,1);
});
test('resolución, penalización y bloqueo final',()=>{
 let game=resolve(freshGame(),'error','LA VIDA ES BELLA',1000);assert.equal(game.lives,3);
 game=resolve(game,'¡la vida es bélla!','LA VIDA ES BELLA',5000);
 assert.equal(game.status,'won');assert.equal(elapsed(game,90000),4);assert.equal(score(game),588);
 assert.equal(guess(game,'Z','LA VIDA ES BELLA'),game);
});
test('derrota sin vidas negativas ni puntos negativos',()=>{
 let game=freshGame();for(let i=0;i<3;i++)game=resolve(game,'mal','BIEN',1000+i*1000);
 assert.equal(game.lives,0);assert.equal(game.status,'lost');assert.equal(score(game),0);
});
test('revelar todas las letras gana',()=>{
 const game=guess(freshGame(),'a','Á A!',1000);assert.equal(game.status,'won');assert.equal(score(game),1000);
});
test('panel determinista y fecha local',()=>{
 assert.deepEqual(dailyPanel('2026-11-12'),dailyPanel('2026-11-12'));
 assert.notDeepEqual(dailyPanel('2026-11-12'),dailyPanel('2026-11-13'));
 assert.equal(dayKey(new Date('2026-11-12T06:00:00Z')),'2026-11-12');
});
test('catálogo anual de 366 paneles únicos y jugables',()=>{
 assert.equal(PANELS.length,366);
 assert.equal(new Set(PANELS.map(([,phrase])=>solution(phrase))).size,366);
 for(const [category,phrase] of PANELS){
  assert.ok(category.trim());
  assert.match(phrase,/^[A-ZÁÉÍÓÚÜÑ !¡¿?,.:;-]+$/);
  assert.ok(phrase.length>=8 && phrase.length<=60,phrase);
  let game=freshGame();
  for(const letter of new Set(normalize(phrase).replace(/[^A-ZÑ]/g,'')))game=guess(game,letter,phrase,1000);
  assert.equal(game.status,'won',phrase);
 }
});
test('un año completo, incluido bisiesto, sin repetir panel',()=>{
 for(const year of [2027,2028]){
  const phrases=[];
  for(let time=Date.UTC(year,0,1);time<Date.UTC(year+1,0,1);time+=86400000){
   const key=new Date(time).toISOString().slice(0,10);
   phrases.push(solution(dailyPanel(key).phrase));
  }
  assert.equal(new Set(phrases).size,phrases.length);
 }
 assert.equal(dailyPanel('2026-11-12').phrase,dailyPanel('2027-11-13').phrase);
});
