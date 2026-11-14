import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeStatistics} from '../src/statistics.js';
const result=(day,status='won',points=800)=>({day,status,points});
test('estadísticas iniciales sin divisiones por cero',()=>{
 assert.deepEqual(summarizeStatistics([],'2026-11-12'),{played:0,wins:0,winRate:0,bestScore:0,streak:0});
});
test('victorias, derrotas, porcentaje redondeado y mejor puntuación',()=>{
 assert.deepEqual(summarizeStatistics([result('2026-11-12'),result('2026-11-13','lost',0),result('2026-11-14','won',950)],'2026-11-14'),{played:3,wins:2,winRate:67,bestScore:950,streak:3});
});
test('la racha sigue activa hasta que termina la oportunidad de hoy',()=>{
 const results=[result('2026-11-12'),result('2026-11-13')];
 assert.equal(summarizeStatistics(results,'2026-11-14').streak,2);
 assert.equal(summarizeStatistics(results,'2026-11-15').streak,0);
 assert.equal(summarizeStatistics([...results,result('2026-11-15')],'2026-11-15').streak,1);
});
test('las derrotas mantienen racha y varios ensayos en el mismo día no la inflan',()=>{
 const stats=summarizeStatistics([result('2026-11-12'),result('2026-11-13','lost',0),result('2026-11-13')],'2026-11-13');
 assert.equal(stats.played,3);assert.equal(stats.streak,2);
});
test('fechas consecutivas entre meses, años y día bisiesto',()=>{
 assert.equal(summarizeStatistics([result('2027-12-31'),result('2028-01-01')],'2028-01-01').streak,2);
 assert.equal(summarizeStatistics([result('2028-02-28'),result('2028-02-29'),result('2028-03-01')],'2028-03-01').streak,3);
});
test('solo las partidas terminadas cuentan',()=>{
 const stats=summarizeStatistics([result('2026-11-12','playing'),result('2026-11-13'),result('2026-11-15')],'2026-11-13');
 assert.equal(stats.played,1);assert.equal(stats.streak,1);
});
