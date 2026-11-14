import {createHmac,randomUUID,timingSafeEqual,createHash} from 'node:crypto';
import {dailyPanel,dayKey,score,normalize,isLetter} from '../src/game.js';
import {hasLaunched,nextPanelAt} from '../src/schedule.js';
import {credentials,redis,LOAD_GAME_SCRIPT,READ_SUMMARY_SCRIPT,SAVE_GAME_SCRIPT} from '../server/store.js';
import {applyAction,freshGame,GameError} from '../server/rules.js';
import {summarizeStatistics} from '../src/statistics.js';

const COOKIE='elpanelito_player';
const digest=value=>createHash('sha256').update(value).digest('hex').slice(0,24);
function player(req,res){
 const secret=credentials().token;
 const sign=id=>createHmac('sha256',secret).update(id).digest('hex');
 const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
 if(cookie){
  const [id,signature]=cookie.split('.');
  if(/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(signature||'')){
   if(timingSafeEqual(Buffer.from(signature),Buffer.from(sign(id))))return id;
  }
 }
 const id=randomUUID();
 res.setHeader('Set-Cookie',`${COOKIE}=${id}.${sign(id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=34560000`);
 return id;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Vary','Cookie');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Método no permitido.'});}
 try{
  const now=Date.now();
  if(!hasLaunched(now))throw new GameError('El juego todavía no ha comenzado.',425);
  if(req.method==='POST'){
   const origin=req.headers.origin;
   if(!origin||new URL(origin).host!==req.headers.host)throw new GameError('Origen no permitido.',403);
   if(!req.headers['content-type']?.startsWith('application/json'))throw new GameError('Se requiere JSON.',415);
   if(Number(req.headers['content-length']||0)>2048)throw new GameError('Solicitud demasiado grande.',413);
  }
  const day=dayKey(new Date(now));
  let body;
  if(req.method==='POST'){
   body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(JSON.stringify(body??null).length>2048)throw new GameError('Solicitud demasiado grande.',413);
   if(body?.day!==day)return res.status(409).json({error:'Ya hay un nuevo panel. Actualiza la partida para jugarlo.',code:'PANEL_CHANGED',day,serverNow:now});
  }
  const namespace=process.env.RANKING_NAMESPACE||'ep';
  const panel=dailyPanel(day);
  const id=player(req,res),publicId=digest(id);
  const ip=req.headers['x-real-ip']||req.headers['x-forwarded-for']?.split(',')[0]||'unknown';
  const gameKey=`${namespace}:game:v1:${day}:${id}`,rankKey=`${namespace}:ranking:v1:${day}`,statsKey=`${namespace}:stats:v1:${id}`;
  const rateKey=`${namespace}:rate:${digest(`${day}:${ip}`)}`;
  const initial=JSON.stringify(freshGame());
  const loadStarted=performance.now();
  const loaded=await redis('EVAL',LOAD_GAME_SCRIPT,4,rateKey,gameKey,rankKey,statsKey,240,initial,req.method==='GET'?'full':'game');
  const loadDuration=performance.now()-loadStarted;
  if(!loaded[0])throw new GameError('Demasiadas solicitudes. Espera un minuto.',429);
  const before=loaded[1];
  let rawRanking=loaded[2],storedStats=loaded[3],commitDuration=0;
  let game=JSON.parse(before);
  if(req.method==='POST'){
   const next=applyAction(game,body,panel.phrase,now);
   if(next!==game){
    const saving=body.action==='save';
    const entry=saving?JSON.stringify({id:publicId,name:next.nickname,points:score(next)}):'';
    // Higher points win; ties favor the earlier completion. All writes are atomic.
    const rankScore=saving?score(next)*1e9+1e9-(next.endedAt-Date.parse(`${day}T00:00:00Z`)):'';
    const finished=game.status==='playing'&&next.status!=='playing';
    const result=finished?JSON.stringify({day,status:next.status,points:score(next)}):'';
    const commitStarted=performance.now();
    const [saved,rankSnapshot,statsSnapshot]=await redis('EVAL',SAVE_GAME_SCRIPT,3,gameKey,rankKey,statsKey,before,JSON.stringify(next),rankScore,entry,finished?day:'',result);
    commitDuration=performance.now()-commitStarted;
    if(!saved)throw new GameError('La partida cambió en otra pestaña. Actualiza e inténtalo de nuevo.',409);
    rawRanking=rankSnapshot;storedStats=statsSnapshot;
    game=next;
   }
  }
  if(!rawRanking){const start=performance.now();[rawRanking,storedStats]=await redis('EVAL',READ_SUMMARY_SCRIPT,2,rankKey,statsKey);commitDuration=performance.now()-start;}
  res.setHeader('Server-Timing',`storage_load;dur=${loadDuration.toFixed(1)}, storage_commit;dur=${commitDuration.toFixed(1)}`);
  const ranking=rawRanking.map(entry=>JSON.parse(entry));
  const results=storedStats.filter((_,index)=>index%2===1).map(value=>JSON.parse(value));
  const statistics=summarizeStatistics(results,day);
  const correctLetters=game.guessed.filter(letter=>normalize(panel.phrase).includes(letter));
  const words=panel.phrase.split(' ').map(word=>[...word].map(char=>!isLetter(char)||game.status!=='playing'||correctLetters.includes(normalize(char))?char:null));
  // Only revealed characters leave the server. The production board uses this payload.
  const publicGame={...game,history:game.history??game.guessed.map(letter=>correctLetters.includes(letter)?'hit':'miss')};
  return res.status(200).json({day,panel:{number:panel.number,category:panel.category,words,correctLetters},game:publicGame,points:score(game),ranking,statistics,playerId:publicId,serverNow:now,nextPanelAt:nextPanelAt(new Date(now))});
 }catch(error){
  const status=error instanceof GameError?error.status:error instanceof SyntaxError?400:503;
  return res.status(status).json({error:status===503?'El servidor del ranking no está disponible temporalmente. Inténtalo de nuevo.':error.message});
 }
}
