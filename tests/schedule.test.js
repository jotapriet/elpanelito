import test from 'node:test';
import assert from 'node:assert/strict';
import {LAUNCH_AT,hasLaunched,launchCountdown,panelDay,nextPanelAt} from '../src/schedule.js';
import {dailyPanel,PANELS} from '../src/game.js';
test('apertura exacta a las 07:00 de Madrid y cuenta atrás sin negativos',()=>{
 assert.equal(LAUNCH_AT,Date.parse('2026-11-12T06:00:00Z'));
 assert.equal(hasLaunched(LAUNCH_AT-1),false);
 assert.equal(hasLaunched(LAUNCH_AT),true);
 assert.deepEqual(launchCountdown(LAUNCH_AT-90061000),[1,1,1,1]);
 assert.deepEqual(launchCountdown(LAUNCH_AT+1000),[0,0,0,0]);
});
test('el primer panel comienza el día de lanzamiento y dura hasta las 07:00 siguientes',()=>{
 assert.equal(panelDay(new Date(LAUNCH_AT-1)),'2026-11-11');
 const first=dailyPanel(panelDay(new Date(LAUNCH_AT)));
 assert.equal(first.number,1);assert.equal(first.phrase,PANELS[0][1]);
 assert.equal(dailyPanel(panelDay(new Date('2026-11-13T05:59:59Z'))).number,1);
 assert.equal(dailyPanel(panelDay(new Date('2026-11-13T06:00:00Z'))).number,2);
 assert.equal(nextPanelAt(new Date(LAUNCH_AT)),Date.parse('2026-11-13T06:00:00Z'));
});
test('cambios de hora de verano e invierno conservan las 07:00 de Madrid',()=>{
 assert.equal(panelDay(new Date('2027-03-28T04:59:59Z')),'2027-03-27');
 assert.equal(panelDay(new Date('2027-03-28T05:00:00Z')),'2027-03-28');
 assert.equal(nextPanelAt(new Date('2027-03-27T06:00:00Z')),Date.parse('2027-03-28T05:00:00Z'));
 assert.equal(nextPanelAt(new Date('2027-10-30T05:00:00Z')),Date.parse('2027-10-31T06:00:00Z'));
 assert.equal(panelDay(new Date('2027-10-31T05:59:59Z')),'2027-10-30');
 assert.equal(panelDay(new Date('2027-10-31T06:00:00Z')),'2027-10-31');
});
