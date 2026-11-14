import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,freshGame} from '../server/rules.js';
import {score} from '../src/game.js';
test('el servidor ignora puntos, vidas y tiempo enviados por el cliente',()=>{
 const game=applyAction(freshGame(),{action:'guess',letter:'X',points:999999,lives:200,startedAt:0},'HOLA',1000);
 assert.equal(game.lives,4);assert.equal(game.wrong,1);assert.equal(game.startedAt,1000);
 const won=applyAction(game,{action:'resolve',answer:'HOLA',points:999999},'HOLA',5000);
 assert.equal(score(won),738);
});
test('un apodo no puede publicar una partida sin terminar ni una partida sin puntos',()=>{
 assert.throws(()=>applyAction(freshGame(),{action:'save',name:'Ana'},'HOLA',1000));
 const game={...freshGame(),status:'lost',lives:0,startedAt:1000,endedAt:2000};
 assert.throws(()=>applyAction(game,{action:'save',name:'Ana'},'HOLA',2000));
});
test('nombre validado y guardado idempotente',()=>{
 const game=applyAction(freshGame(),{action:'resolve',answer:'HOLA'},'HOLA',1000);
 for(const name of ['<script>','1234567890123','   ','Ana\nMal'])assert.throws(()=>applyAction(game,{action:'save',name},'HOLA',1000));
 const saved=applyAction(game,{action:'save',name:'  Ñandú_7  '},'HOLA',1000);
 assert.equal(saved.nickname,'Ñandú_7');
 assert.equal(applyAction(saved,{action:'save',name:'Otro'},'HOLA',1000),saved);
 assert.throws(()=>applyAction(saved,{action:'guess',letter:'A'},'HOLA',2000));
});
test('acciones inválidas no cambian la partida y repetir letras no penaliza',()=>{
 const game=applyAction(freshGame(),{action:'guess',letter:'A'},'HOLA',1000);
 assert.equal(applyAction(game,{action:'guess',letter:'A'},'HOLA',2000),game);
 for(const body of [{action:'guess',letter:'AB'},{action:'guess',letter:'1'},{action:'resolve',answer:''},{action:'reset'},{action:'save'},null])assert.throws(()=>applyAction(game,body,'HOLA',2000));
});
