import test from 'node:test';
import assert from 'node:assert/strict';
import {serverClock} from '../src/server-clock.js';
import statusHandler from '../api/status.js';
import {LAUNCH_AT} from '../src/schedule.js';
function statusAt(now){
 const original=Date.now;Date.now=()=>now;
 const res={headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 try{statusHandler({method:'GET'},res);return res;}finally{Date.now=original;}
}
test('la apertura depende exclusivamente de la hora del servidor',()=>{
 const before=statusAt(LAUNCH_AT-1);
 assert.equal(before.data.launched,false);assert.equal(before.data.day,null);
 assert.equal(before.headers['Cache-Control'],'no-store');
 const launched=statusAt(LAUNCH_AT);
 assert.equal(launched.data.launched,true);assert.equal(launched.data.day,'2026-11-12');
 assert.equal(launched.data.nextPanelAt,LAUNCH_AT+86400000);
 assert.equal(statusAt(LAUNCH_AT+86400000).data.day,'2026-11-13');
});
test('cambiar el reloj del dispositivo no modifica el tiempo sincronizado',()=>{
 const clock=serverClock(LAUNCH_AT,100);
 const original=Date.now;
 try{
  Date.now=()=>Date.parse('2050-01-01');assert.equal(clock(1100),LAUNCH_AT+1000);
  Date.now=()=>0;assert.equal(clock(2100),LAUNCH_AT+2000);
 }finally{Date.now=original;}
});
