import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MAX_LIVES, PANELS, dayKey, dailyPanel, normalize, isLetter, elapsed, score, freshGame, guess, resolve, readLocal, writeLocal } from './game.js';
import './styles.css';
import { playSound, stopSound, unlockSound } from './sound.js';
import { hasLaunched, launchCountdown, nextPanelAt } from './schedule.js';
import { rankingRequest, statusRequest } from './ranking-api.js';
import { serverClock } from './server-clock.js';
import { summarizeStatistics } from './statistics.js';
import { shareResult } from './share.js';
import Board from './Board.jsx';
import Celebration from './Celebration.jsx';

const NICKNAME_KEY='elpanelito:last-nickname';
const PRACTICE_STATS_KEY='elpanelito:practice-results:v1';
function practiceResults(){const value=readLocal(PRACTICE_STATS_KEY,[]);return Array.isArray(value)?value:[];}
const rememberedNickname=()=>{const value=readLocal(NICKNAME_KEY,'');return typeof value==='string'?value.slice(0,12):'';};
const ROWS=['QWERTYUIOP','ASDFGHJKLÑ','ZXCVBNM'];
const clock = seconds => `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
function NextPanelCountdown({seconds}) {
 const values=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60];
 const labels=['horas','minutos','segundos'];
 return <div className="next-panel-countdown"><span className="eyebrow muted">TU PRÓXIMO RETO EN</span><div className="next-panel-digits" role="timer" aria-live="off" aria-label={`${values[0]} horas, ${values[1]} minutos y ${values[2]} segundos para el próximo panel`}>{values.map((value,index)=><div key={labels[index]}><strong>{String(value).padStart(2,'0')}</strong><span>{labels[index]}</span></div>)}</div><p>Cada día a las 07:00 · hora peninsular española</p></div>;
}
function PersonalStatistics({statistics,local=false}) {
 const items=[['Partidas jugadas',statistics.played],['Victorias',`${statistics.winRate}%`],['Mejor puntuación',statistics.bestScore],['Días de racha',statistics.streak]];
 return <section className="personal-statistics" aria-label="Estadísticas personales"><span className="eyebrow muted">TU RECORRIDO{local?' · PRUEBAS LOCALES':''}</span><dl className="statistics-grid">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="statistics-note">{statistics.played===0?'Termina tu primer panel para empezar a sumar.':`${statistics.wins} ${statistics.wins===1?'victoria':'victorias'} de ${statistics.played} ${statistics.played===1?'partida':'partidas'}.`} La racha cuenta días consecutivos con un panel terminado, ganes o pierdas.</p>{local&&<p className="statistics-note">Cada partida de prueba cuenta aquí. No modifica tus estadísticas de producción.</p>}</section>;
}
function Icon({name,size=20}) { const paths={sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,chart:<><path d="M5 20V10h4v10m2 0V4h4v16m2 0v-7h4v7"/></>,help:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/></>,time:<><circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6"/></>,arrow:<path d="M5 12h14m-5-5 5 5-5 5"/>,share:<><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/></>,heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>}; return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.sun}</svg>; }
function Modal({title,onClose,children}) {
 const ref=useRef(null);
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar">✕</button></div>{children}</dialog>;
}
const LOCAL_MODE = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
function App(){
 return LOCAL_MODE?<LocalApp/>:<ProductionApp/>;
}
function ProductionApp(){
 const [status,setStatus]=useState(null),[now,setNow]=useState(0),[error,setError]=useState('');
 const clockRef=useRef(()=>0),busy=useRef(false),retryAt=useRef(0);
 async function refresh(){
  if(busy.current)return;busy.current=true;retryAt.current=performance.now()+5000;
  try{const data=await statusRequest();clockRef.current=serverClock(data.serverNow);setNow(data.serverNow);setStatus(data);setError('');}
  catch{setError('No se ha podido conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.');}
  finally{busy.current=false;}
 }
 useEffect(()=>{
  refresh();
  const poll=setInterval(refresh,30000);
  const visibility=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('online',refresh);
  return()=>{clearInterval(poll);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',refresh);};
 },[]);
 useEffect(()=>{const timer=setInterval(()=>{const time=clockRef.current();setNow(time);if(status&&time>=status.nextPanelAt&&performance.now()>=retryAt.current)refresh();},1000);return()=>clearInterval(timer);},[status]);
 if(!status)return <div className="app launch-page"><main className="launch-content"><h1>ElPanelito<span>.</span></h1><p role="status">{error||'Consultando el panel disponible…'}</p>{error&&<button className="primary-button" onClick={refresh}>Reintentar conexión</button>}</main></div>;
 if(!status.launched)return <><LaunchScreen now={now} launchAt={status.launchAt}/>{error&&<div className="toast" role="alert">{error} <button onClick={refresh}>Reintentar</button></div>}</>;
 return <Game key={status.day} initialDay={status.day}/>;
}
function LocalApp(){
 const [practiceOffset,setPracticeOffset]=useState(0);
 const [session,setSession]=useState(0);
 const [now,setNow]=useState(Date.now());
 const [skipLaunch,setSkipLaunch]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 if(!hasLaunched(now)&&!(LOCAL_MODE&&skipLaunch))return <LaunchScreen now={now} onSkip={LOCAL_MODE?()=>setSkipLaunch(true):null}/>;
 return <Game key={`${practiceOffset}:${session}`} practiceOffset={practiceOffset} onRestart={()=>setSession(value=>value+1)} onNext={()=>setPracticeOffset(value=>value+1)}/>;
}
function LaunchScreen({now,onSkip,launchAt}){
 const units=['días','horas','minutos','segundos'];
 return <div className="app launch-page"><header className="header"><a href="./" className="brand" aria-label="ElPanelito inicio"><span className="brand-mark">p<span>·</span></span>El<span className="brand-thin">Panelito</span><span className="brand-dot">.</span></a><span className="eyebrow muted">MUY PRONTO</span></header><main className="launch-content"><span className="eyebrow"><span className="live-dot"/> ALGO BUENO ESTÁ POR DESCUBRIRSE</span><div className="launch-tiles" aria-hidden="true">{['H','O','L','A'].map((letter,index)=><span key={letter} className={`tile ${index<2?'revealed':''}`}>{index<2?letter:<span className="tile-line"/>}</span>)}</div><h1>Un pequeño panel.<br/><span>Un gran reto diario.</span></h1><p>Una frase oculta, cinco vidas y todo tu ingenio.<br/>Tu nueva rutina empieza aquí.</p><div className="launch-countdown" role="timer" aria-label="Tiempo restante para el lanzamiento">{launchCountdown(now,launchAt).map((value,index)=><div key={units[index]}><strong>{String(value).padStart(2,'0')}</strong><span>{units[index]}</span></div>)}</div><p className="launch-date">Nos vemos el <strong>12 de noviembre de 2026</strong><br/>a las <strong>07:00 · hora peninsular española</strong></p><span className="launch-footnote">El juego se abrirá automáticamente. No necesitas recargar.</span>{onSkip&&<div className="launch-local"><span>Vista previa local · Las pruebas siguen disponibles</span><button className="primary-button" onClick={onSkip}>Saltar espera y probar <Icon name="arrow" size={18}/></button></div>}</main><footer className="launch-footer">Una dosis diaria de ingenio. A partir de las 07:00.</footer></div>;
}
function Game({practiceOffset=0,onRestart,onNext,initialDay}){
 const [day,setDay]=useState(()=>initialDay??dayKey());
 const daily=dailyPanel(day);
 const [category,phrase]=PANELS[((daily.number-1+practiceOffset)%PANELS.length+PANELS.length)%PANELS.length];
 const [remotePanel,setRemotePanel]=useState({number:0,category:'Cargando…',words:[],correctLetters:[]});
 const panel=LOCAL_MODE?{number:daily.number+practiceOffset,category,phrase}:remotePanel;
 // Local practice never reads or overwrites the real daily attempt.
 const rankingKey=LOCAL_MODE?`elpanelito:practice-ranking:${day}:${panel.number}`:`paneldiario:ranking:${day}`;
 const [game,setGame]=useState(freshGame);
 const [now,setNow]=useState(Date.now()),[modal,setModal]=useState(null),[answer,setAnswer]=useState(''),[nickname,setNickname]=useState(rememberedNickname),[toast,setToast]=useState(''),[warning,setWarning]=useState('');
 const [ranking,setRanking]=useState(()=>LOCAL_MODE?readLocal(rankingKey,[]):[]);
 const [statistics,setStatistics]=useState(()=>summarizeStatistics(LOCAL_MODE?practiceResults():[],day));
 const practiceCounted=useRef(false);
 const [pending,setPending]=useState(!LOCAL_MODE),[networkError,setNetworkError]=useState('');
 const [playerId,setPlayerId]=useState(null),[nextDeadline,setNextDeadline]=useState(null);
 const gameClock=useRef(()=>0),rolloverRetry=useRef(0);
 const pendingRequest=useRef(false);
 const [light,setLight]=useState(false);
 const [celebration,setCelebration]=useState(0);
 const [soundEnabled,setSoundEnabled]=useState(()=>readLocal('elpanelito:sound',true)!==false);
 useEffect(()=>()=>stopSound(),[]);
 function toggleSound(){const enabled=!soundEnabled;setSoundEnabled(enabled);writeLocal('elpanelito:sound',enabled);if(enabled)playSound('correct');else stopSound();}
 function soundFor(next,fallback){if(game.status==='playing'&&next.status==='won')setCelebration(value=>value+1);if(soundEnabled)playSound(next.status==='won'?'won':next.status==='lost'?'lost':fallback);}
 const done=game.status!=='playing', points=score(game);
 useEffect(()=>{const timer=setInterval(()=>{const time=LOCAL_MODE?Date.now():gameClock.current();setNow(time);if(LOCAL_MODE)setDay(dayKey(new Date(time)));else if(nextDeadline&&time>=nextDeadline&&performance.now()>=rolloverRetry.current){rolloverRetry.current=performance.now()+5000;syncGame();}},1000);return()=>clearInterval(timer);},[nextDeadline]);
 function hydrate(data){setGame(data.game);setRemotePanel(data.panel);setRanking(data.ranking);setStatistics(data.statistics);setPlayerId(data.playerId);gameClock.current=serverClock(data.serverNow);setNow(data.serverNow);setNextDeadline(data.nextPanelAt);setDay(data.day);}
 async function syncGame(body){
  if(pendingRequest.current)return null;
  pendingRequest.current=true;setPending(true);setNetworkError('');
  try{const data=await rankingRequest(body?{...body,day}:undefined);hydrate(data);return data.game;}
  catch(error){setNetworkError(error.message);if(error.code==='PANEL_CHANGED'){try{hydrate(await rankingRequest());setNetworkError('');}catch{ /* Keep retry available. */ }}return null;}
  finally{pendingRequest.current=false;setPending(false);}
 }
 useEffect(()=>{setModal(null);setWarning('');setNickname(rememberedNickname());if(LOCAL_MODE){setGame(freshGame());setRanking(readLocal(rankingKey,[]));setStatistics(summarizeStatistics(practiceResults(),day));}else{syncGame();}},[day]);
 useEffect(()=>{if((modal==='ranking'||modal==='statistics')&&!LOCAL_MODE)syncGame();},[modal]);
 useEffect(()=>{
  if(LOCAL_MODE)return;
  const resume=()=>{if(document.visibilityState==='visible')syncGame();};
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
  return()=>{document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);};
 },[day]);
 useEffect(()=>{
  if(!LOCAL_MODE)return;if(!done){practiceCounted.current=false;return;}if(practiceCounted.current)return;
  practiceCounted.current=true;
  const results=[...practiceResults(),{day,status:game.status,points:score(game)}];
  setStatistics(summarizeStatistics(results,day));
  if(!writeLocal(PRACTICE_STATS_KEY,results))setToast('No se han podido guardar tus estadísticas locales.');
 },[game,done,day]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
 async function play(letter){if(done||pendingRequest.current||pending||networkError)return;if(soundEnabled)unlockSound();const next=LOCAL_MODE?guess(game,letter,panel.phrase):await syncGame({action:'guess',letter});if(!next||next===game)return;soundFor(next,next.lives<game.lives?'incorrect':'correct');if(LOCAL_MODE)setGame(next);setWarning('');}
 useEffect(()=>{function onKey(e){if(modal||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key.length===1&&isLetter(e.key)){e.preventDefault();play(e.key);}}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[modal,game,panel.phrase,pending,networkError,soundEnabled]);
 async function attempt(e){e.preventDefault();if(!answer.trim()||pendingRequest.current)return;if(soundEnabled)unlockSound();const next=LOCAL_MODE?resolve(game,answer,panel.phrase):await syncGame({action:'resolve',answer});if(!next||next===game)return;soundFor(next,'penalty');if(LOCAL_MODE)setGame(next);setModal(null);setAnswer('');if(next.status!=='won')setWarning('Esa no era la frase. Has perdido 2 vidas. ¡Sigue intentándolo!');}
 async function saveName(e){e.preventDefault();const name=nickname.trim().slice(0,12);if(!name||pendingRequest.current)return;if(!LOCAL_MODE){const next=await syncGame({action:'save',name});if(next?.nickname){writeLocal(NICKNAME_KEY,next.nickname);setNickname(next.nickname);setModal('ranking');}return;}const entries=[...ranking.filter(r=>r.id!==day),{id:day,name,points}];if(!writeLocal(rankingKey,entries)){setToast('No se ha podido guardar el ranking.');return;}writeLocal(NICKNAME_KEY,name);setNickname(name);setRanking(entries);setGame(g=>({...g,nickname:name}));setModal('ranking');}
 async function share(){const text=shareResult({game,panel,streak:statistics.streak,url:location.origin});try{await navigator.clipboard.writeText(text);setToast('¡Copiado al portapapeles!');}catch{setAnswer(text);setModal('share');}}
 const remaining=Math.max(0,Math.ceil(((LOCAL_MODE?nextPanelAt(new Date(now)):nextDeadline??now)-now)/1000));
 const boardWords=LOCAL_MODE?panel.phrase.split(' ').map(word=>[...word].map(char=>!isLetter(char)||game.guessed.includes(normalize(char))||done?char:null)):panel.words;
 const leaders=LOCAL_MODE?[...ranking].sort((a,b)=>b.points-a.points).slice(0,10):ranking;
 return <div className={light?'app light':'app'}>
 <header className="header"><a href="./" className="brand" aria-label="ElPanelito inicio"><span className="brand-mark">p<span>·</span></span>El<span className="brand-thin">Panelito</span><span className="brand-dot">.</span></a><nav aria-label="Utilidades"><button className="icon-button" onClick={()=>setModal('statistics')} aria-label="Estadísticas personales" title="Tus estadísticas"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h16M7 16v-4m5 4V5m5 11V9"/></svg></button><button className="icon-button" onClick={()=>setModal('help')} aria-label="Cómo jugar"><Icon name="help"/></button><button className="icon-button" onClick={()=>setModal('ranking')} aria-label="Ranking diario"><Icon name="chart"/></button><button className="icon-button sound-toggle" onClick={toggleSound} aria-label={soundEnabled?'Silenciar efectos de sonido':'Activar efectos de sonido'} aria-pressed={soundEnabled} title={soundEnabled?'Sonido activado':'Sonido desactivado'}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>{soundEnabled?<><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>:<path d="m16 9 6 6m0-6-6 6"/>}</svg></button><span className="nav-divider"/><button className="icon-button" onClick={()=>setLight(!light)} aria-label="Cambiar tema"><Icon name="sun"/></button></nav></header>
 <main className="mx-auto w-full max-w-[960px] px-4 sm:px-8">
 {!LOCAL_MODE&&<div className="network-status" role="status">{pending?'Conectando con tu partida…':networkError?<>{networkError} <button onClick={()=>syncGame()}>Reintentar conexión</button></>:null}</div>}
 {LOCAL_MODE&&<aside className="practice-toolbar" aria-label="Pruebas locales"><div><strong>Modo local · Partidas ilimitadas</strong><span>Prueba los {PANELS.length} paneles sin esperar a mañana.</span></div><div className="practice-actions"><button onClick={onRestart}>Reiniciar panel</button><button onClick={onNext}>Siguiente panel →</button></div></aside>}
 <section className="intro"><span className="eyebrow"><span className="live-dot"/> TU PEQUEÑO RETO DE CADA DÍA</span><h1>Una frase. Cinco vidas.<br/><span>Todo tu ingenio.</span></h1><p>Descubre el panel de hoy. Cada letra cuenta.</p></section>
 <section className="game-card" aria-label="Panel de juego"><div className="panel-heading"><div><span className="eyebrow muted">PANEL #{panel.number.toString().padStart(3,'0')}</span><div className="category"><span className="category-icon">✳</span>{panel.category}</div></div><div className="daily-badge"><span className="live-dot"/> {LOCAL_MODE?'PRÁCTICA LOCAL':'RETO DIARIO'}</div></div>
 <Board key={`${day}:${panel.number}`} words={boardWords} lost={done&&game.status==='lost'}/>
 <div className="panel-bottom"><div className="lives" aria-label={`${game.lives} de ${MAX_LIVES} vidas`}>{Array.from({length:MAX_LIVES},(_,i)=><span key={i} className={i<game.lives?'alive':'dead'}><Icon name="heart" size={18}/></span>)}<span className="lives-label">{game.lives} / {MAX_LIVES} vidas</span></div><div className="timer"><Icon name="time" size={17}/><span>{clock(elapsed(game,now))}</span></div></div></section>
 {!done?<><div className="keyboard-heading"><span>ELIGE UNA LETRA</span><span>También puedes usar tu teclado <span className="desktop-only">⌨</span></span></div><div className="keyboard" aria-label="Teclado virtual">{ROWS.map(row=><div className="key-row" key={row}>{[...row].map(letter=>{const used=game.guessed.includes(letter),hit=LOCAL_MODE?normalize(panel.phrase).includes(letter):panel.correctLetters.includes(letter);return <button key={letter} disabled={used||pending||Boolean(networkError)} onClick={()=>play(letter)} className={`key ${used?(hit?'correct':'incorrect'):''}`} aria-label={`${letter}${used?hit?', acertada':', incorrecta':''}`}>{letter}</button>;})}</div>)}</div><p className="warning" role="status">{warning}</p><div className="resolve-area"><button disabled={pending||Boolean(networkError)} className="primary-button" onClick={()=>{setAnswer('');setModal('resolve');}}>Ya lo tengo. Resolver panel <Icon name="arrow" size={18}/></button><p>Arriesga la frase completa. Un fallo cuesta <strong>2 vidas.</strong></p></div></>:<section className={`result ${game.status}`} aria-live="polite"><span className="eyebrow">{game.status==='won'?'✦ BIEN JUGADO':(LOCAL_MODE?'PRUEBA OTRO PANEL':'MAÑANA, UNA NUEVA OPORTUNIDAD')}</span><h2>{game.status==='won'?'¡Panel resuelto!':'Se acabaron las vidas'}</h2><p>{game.status==='won'?'Tu ingenio tiene recompensa.':(LOCAL_MODE?'La frase ya está revelada. Reinicia o prueba el siguiente panel.':'La frase ya está revelada. ¡Vuelve a intentarlo mañana!')}</p><div className="result-score">{points}<span>puntos</span></div>{points>0&&!game.nickname&&<form className="nickname-form" onSubmit={saveName}><label htmlFor="nickname">{LOCAL_MODE?'Guarda tu resultado de prueba':'Guarda tu puesto en el ranking diario'}</label><div><input id="nickname" value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={12} required placeholder="Tu apodo" autoComplete="nickname" title="Entre 1 y 12 letras, números, espacios, puntos o guiones"/><button disabled={pending} className="primary-button" type="submit">{pending?'Guardando…':'Guardar'}</button></div></form>}<button className="primary-button" onClick={share}><Icon name="share"/> Compartir resultado</button><PersonalStatistics statistics={statistics} local={LOCAL_MODE}/><NextPanelCountdown seconds={remaining}/>{LOCAL_MODE&&<p className="next-panel">Puedes seguir probando desde la barra superior.</p>}</section>}
 <div className="daily-note"><span>✧</span><p>{LOCAL_MODE?'Todos los paneles, todas las veces que quieras.':'Un panel al día. El mismo para todos.'}<br/><strong>{LOCAL_MODE?'Usa la barra superior para seguir probando.':'Vuelve mañana para un nuevo desafío.'}</strong></p></div>
 <footer><span>Hecho para mentes inquietas.</span><button onClick={()=>setModal('help')}>Cómo jugar <span>↗</span></button><span className="footer-date">{new Date(`${day}T12:00:00`).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</span></footer>
 </main>
 {celebration>0&&<Celebration key={celebration}/>}
 {modal==='statistics'&&<Modal title="Tus estadísticas" onClose={()=>setModal(null)}>{pending?<p role="status">Cargando tus estadísticas…</p>:networkError?<p role="alert">{networkError} <button className="primary-button" onClick={()=>syncGame()}>Reintentar</button></p>:<><PersonalStatistics statistics={statistics} local={LOCAL_MODE}/><p className="statistics-note">{LOCAL_MODE?'Se guardan en este navegador para tus pruebas.':'Se guardan con la identidad anónima de este navegador. No dependen del apodo ni de enviar la puntuación al ranking.'}</p></>}</Modal>}
 {modal==='help'&&<Modal title="Un poco de ingenio" onClose={()=>setModal(null)}><p>Adivina la frase de la categoría de hoy con 5 vidas.</p><ol className="rules"><li>Elige letras. Los aciertos revelan todas sus posiciones; los fallos cuestan una vida.</li><li>¿Tienes la frase? Pulsa «Resolver panel». Un intento incorrecto resta 2 vidas.</li><li>Tildes, mayúsculas, espacios y puntuación no afectan a tu respuesta. La Ñ es distinta de la N.</li><li>{LOCAL_MODE?'El reloj empieza con tu primera letra o intento. En modo local puedes reiniciar o cambiar de panel sin límite; recargar empieza una partida nueva.':'El reloj empieza con tu primera letra o intento y sigue contando al salir. Solo hay una partida al día en este navegador.'}</li></ol><div className="formula">Puntos = vidas × 200 − segundos × 3 − letras falladas × 50. Mínimo: 0.</div><p>Cada panel se estrena a las 07:00, hora peninsular española. {LOCAL_MODE?'Los resultados locales son de prueba y no se publican.':'El ranking es compartido: tu apodo y puntuación serán públicos. La partida se guarda en el servidor mediante una cookie anónima.'}</p><button className="primary-button w-full" onClick={()=>setModal(null)}>¡Vamos a jugar! <Icon name="arrow"/></button></Modal>}
 {modal==='resolve'&&<Modal title="Es tu momento" onClose={()=>setModal(null)}><p>Escribe la frase completa. Si fallas, perderás 2 vidas.</p>{networkError&&<p role="alert">{networkError}</p>}<form onSubmit={attempt}><label className="input-label" htmlFor="solution">Tu respuesta</label><input autoFocus id="solution" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Creo que la frase es…" required maxLength={200}/><button disabled={pending} className="primary-button w-full mt-5" type="submit">{pending?'Comprobando…':'Resolver panel'} <Icon name="arrow"/></button></form></Modal>}
 {modal==='ranking'&&<Modal title="El ingenio de hoy" onClose={()=>setModal(null)}><p>Top 10 · {panel.category} · Panel #{panel.number}</p><div className="demo-notice">{LOCAL_MODE?'PRUEBAS LOCALES · Estos resultados no participan en el ranking público.':'RANKING COMPARTIDO · Una participación por navegador y día. Desempate por orden de finalización.'}</div>{pending&&<p role="status">Cargando clasificación…</p>}{networkError&&<p role="alert">{networkError} <button className="primary-button" onClick={()=>syncGame()}>Reintentar</button></p>}{!pending&&!networkError&&leaders.length===0&&<p>Aún no hay resultados. ¡El primer puesto puede ser tuyo!</p>}<div className="leaderboard">{leaders.map((entry,i)=><div className={entry.id===(LOCAL_MODE?day:playerId)?'your-rank':''} key={entry.id}><span className="rank">{String(i+1).padStart(2,'0')}</span><strong>{entry.name}{entry.id===(LOCAL_MODE?day:playerId)?' (tú)':''}</strong><span>{entry.points} <small>pts</small></span></div>)}</div></Modal>}
 {modal==='share'&&<Modal title="Comparte tu resultado" onClose={()=>setModal(null)}><p>El portapapeles no está disponible. Copia este texto:</p><textarea readOnly value={answer} rows={7} onFocus={e=>e.target.select()}/></Modal>}
 {toast&&<div className="toast" role="status">{toast}</div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
