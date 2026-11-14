// Integration smoke test with real Redis, isolated keys and automatic cleanup.
// Run with: node --env-file=.env.local scripts/check-ranking.mjs
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import handler from '../api/game.js';
import {redis} from '../server/store.js';
import {LAUNCH_AT} from '../src/schedule.js';
import {dailyPanel,dayKey} from '../src/game.js';

process.env.RANKING_NAMESPACE=`ep-test:${randomUUID()}`;
const originalNow=Date.now;
const originalFetch=globalThis.fetch;
let storageRequests=0;
globalThis.fetch=(...args)=>{storageRequests++;return originalFetch(...args);};
let now=LAUNCH_AT-1000;
Date.now=()=>now;
const first={},second={};
async function call(client,body,extraHeaders={}){
 const req={method:body?'POST':'GET',headers:{host:'elpanelito.vercel.app',origin:'https://elpanelito.vercel.app','content-type':'application/json','x-real-ip':'127.0.0.99',cookie:client.cookie||'',...extraHeaders},body:body?{day:dayKey(new Date(now)),...body}:undefined};
 const response={headers:{},statusCode:200,setHeader(name,value){this.headers[name]=value;},status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};
 await handler(req,response);
 if(response.headers['Set-Cookie'])client.cookie=response.headers['Set-Cookie'].split(';')[0];
 return response;
}
try{
 assert.equal((await call(first)).statusCode,425);
 now=LAUNCH_AT+1000;
 const beforeLoad=storageRequests;
 const start=await call(first);assert.equal(start.statusCode,200);assert.equal(start.data.ranking.length,0);
 assert.equal(storageRequests-beforeLoad,1,'Cargar la partida requiere un solo viaje a Redis');
 assert.equal(start.data.statistics.played,0);
 assert.equal(start.data.panel.number,1);
 assert.equal(start.data.panel.words.flat().every(char=>char===null),true);
 assert.equal(start.data.panel.phrase,undefined);
 const stale=await call(first,{action:'guess',letter:'A',day:'2099-01-01',serverNow:0});
 assert.equal(stale.statusCode,409);assert.equal(stale.data.code,'PANEL_CHANGED');
 assert.equal((await call(first)).data.game.guessed.length,0);
 assert.match(first.cookie,/elpanelito_player=/);
 assert.match(start.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Lax/);
 assert.equal((await call(first,{action:'save',name:'Falso',points:1000})).statusCode,400);
 assert.equal((await call(first,{action:'guess',letter:'A'},{origin:'https://otro.example'})).statusCode,403);
 const beforeGuess=storageRequests;
 await call(first,{action:'guess',letter:'X'});
 assert.equal(storageRequests-beforeGuess,2,'Una jugada requiere solo dos viajes a Redis');
 now+=10000;
 const phrase=dailyPanel(dayKey(new Date(now))).phrase;
 const win=await call(first,{action:'resolve',answer:phrase,points:999999,lives:500});
 assert.equal(win.data.points,720);
 assert.deepEqual(win.data.statistics,{played:1,wins:1,winRate:100,bestScore:720,streak:1});
 const saved=await call(first,{action:'save',name:'Prueba_A'});assert.equal(saved.statusCode,200);
 assert.equal(saved.data.ranking.length,1);assert.equal(saved.data.ranking[0].points,720);
 const again=await call(first,{action:'save',name:'Duplicado'});assert.equal(again.data.ranking.length,1);assert.equal(again.data.game.nickname,'Prueba_A');
 assert.equal(again.data.statistics.played,1);
 const reload=await call(first);assert.equal(reload.data.game.status,'won');
 assert.equal(reload.data.statistics.played,1);
 const other=await call(second);assert.equal(other.data.ranking[0].name,'Prueba_A');assert.equal(other.data.game.status,'playing');
 assert.equal(other.data.statistics.played,0);
 await call(second,{action:'resolve',answer:phrase});
 const top=await call(second,{action:'save',name:'Prueba_B'});
 assert.deepEqual(top.data.ranking.map(row=>row.name),['Prueba_B','Prueba_A']);
 assert.equal((await call(first,{action:'guess',letter:'Z'})).statusCode,409);
 const third={};await call(third);
 const concurrent=await Promise.all([call(third,{action:'guess',letter:'A'}),call(third,{action:'guess',letter:'B'})]);
 assert.ok(concurrent.some(response=>response.statusCode===200));
 const state=await call(third);assert.equal(new Set(state.data.game.guessed).size,state.data.game.guessed.length);
 await Promise.all([call(third,{action:'resolve',answer:phrase}),call(third,{action:'resolve',answer:phrase})]);
 assert.equal((await call(third)).data.statistics.played,1);
 now=LAUNCH_AT+86400000+1000;
 const tomorrowPhrase=dailyPanel(dayKey(new Date(now))).phrase;
 const tomorrow=await call(first,{action:'resolve',answer:tomorrowPhrase});
 assert.deepEqual(tomorrow.data.statistics,{played:2,wins:2,winRate:100,bestScore:1000,streak:2});
 now=LAUNCH_AT+2*86400000+1000;
 const missed=await call(first);assert.equal(missed.data.statistics.streak,2);assert.equal(missed.data.statistics.played,2);
 now=LAUNCH_AT+3*86400000+1000;
 assert.equal((await call(first)).data.statistics.streak,0);
 for(let i=0;i<3;i++)await call(first,{action:'resolve',answer:'respuesta equivocada'});
 const lost=await call(first);
 assert.deepEqual(lost.data.statistics,{played:3,wins:2,winRate:67,bestScore:1000,streak:1});
 console.log('Ranking y estadísticas reales: duplicados, persistencia, aislamiento, concurrencia, victorias, derrotas y rachas correctos.');
}finally{
 Date.now=originalNow;
 globalThis.fetch=originalFetch;
 let cursor='0';
 do{
  const [next,keys]=await redis('SCAN',cursor,'MATCH',`${process.env.RANKING_NAMESPACE}:*`,'COUNT',100);
  if(keys.length)await redis('DEL',...keys);
  cursor=String(next);
 }while(cursor!=='0');
}
