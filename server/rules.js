import {freshGame,guess,resolve,score,isLetter,normalize} from '../src/game.js';
export class GameError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
export function applyAction(game,body,phrase,now) {
 if(!body||typeof body!=='object')throw new GameError('Solicitud no válida.');
 if(body.action==='save'){
  if(game.status==='playing'||score(game)<=0)throw new GameError('Termina una partida con puntos para entrar en el ranking.');
  if(game.nickname)return game; // Idempotent retries cannot create duplicate entries.
  if(typeof body.name!=='string')throw new GameError('Introduce un apodo.');
  const name=body.name.normalize('NFC').trim();
  if(!/^[\p{L}\p{N} _.-]{1,12}$/u.test(name))throw new GameError('Usa entre 1 y 12 letras, números, espacios, puntos o guiones.');
  return {...game,nickname:name};
 }
 if(game.status!=='playing')throw new GameError('La partida de hoy ya ha terminado.',409);
 if(body.action==='guess'){
  if(typeof body.letter!=='string'||!isLetter(body.letter)||body.letter.length!==1)throw new GameError('Elige una letra válida.');
  return guess(game,normalize(body.letter),phrase,now);
 }
 if(body.action==='resolve'){
  if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>200)throw new GameError('Escribe una respuesta de hasta 200 caracteres.');
  return resolve(game,body.answer,phrase,now);
 }
 throw new GameError('Acción no válida.');
}
export {freshGame};
