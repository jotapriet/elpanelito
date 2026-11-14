import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,guess,resolve} from '../src/game.js';
import {shareResult} from '../src/share.js';
const panel={number:1,category:'Cine',phrase:'LA VIDA ES BELLA'};
test('comparte orden de aciertos, fallos y resoluciones sin respuestas ni letras',()=>{
 let game=guess(freshGame(),'A',panel.phrase,1000);
 game=guess(game,'X',panel.phrase,2000);
 game=resolve(game,'NO ES ESTA',panel.phrase,3000);
 game=resolve(game,panel.phrase,panel.phrase,4000);
 const text=shareResult({game,panel,streak:3,url:'https://elpanelito.vercel.app'});
 assert.ok(text.includes('🟩⬛🟥🏆'));
 assert.ok(text.includes('🔥 Racha: 3 días'));
 assert.ok(!text.includes(panel.phrase));assert.ok(!text.includes('NO ES ESTA'));
 assert.ok(!JSON.stringify(game.history).includes(panel.phrase));
});
test('una letra repetida no añade emojis y la derrota conserva su secuencia',()=>{
 let game=guess(freshGame(),'X',panel.phrase,1000);
 game=guess(game,'X',panel.phrase,2000);
 game=resolve(game,'ERROR',panel.phrase,3000);
 game=resolve(game,'ERROR',panel.phrase,4000);
 const text=shareResult({game,panel,streak:1,url:'https://example.com'});
 assert.ok(text.includes('⬛🟥🟥'));assert.equal(game.history.length,3);
 assert.ok(text.includes('❌ Panel sin resolver'));assert.ok(text.includes('🔥 Racha: 1 día'));
});
test('partidas anteriores sin historial siguen siendo compartibles',()=>{
 const game={...freshGame(),guessed:['A','X'],status:'won'};delete game.history;
 const text=shareResult({game,panel,streak:0,url:'https://example.com'});
 assert.ok(text.includes('🟩⬛'));assert.ok(text.includes('🔥 Racha: 0 días'));
});
