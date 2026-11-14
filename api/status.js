import {LAUNCH_AT,hasLaunched,nextPanelAt,panelDay,TIME_ZONE} from '../src/schedule.js';
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Método no permitido.'});}
 const serverNow=Date.now(),launched=hasLaunched(serverNow);
 return res.status(200).json({serverNow,launched,launchAt:LAUNCH_AT,timeZone:TIME_ZONE,day:launched?panelDay(new Date(serverNow)):null,nextPanelAt:launched?nextPanelAt(new Date(serverNow)):LAUNCH_AT});
}
