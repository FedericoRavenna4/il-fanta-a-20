import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../supabase/migrations/202608220002_authoritative_dynamic_holders.sql", import.meta.url), "utf8");

const validBaselines = (rows) => [["titano",10,94],["abisso",5,31]].every(([key,team,value]) => {
  const current=rows.filter(row=>row.key===key && row.current);
  return current.length===1 && current[0].team===team && current[0].value===value;
});

function titano(rows, incumbent) {
  return [...rows].sort((a,b)=>b.value-a.value || (a.team===incumbent?-1:b.team===incumbent?1:0) || a.team-b.team)[0];
}
function abisso(rows) {
  return [...rows].sort((a,b)=>a.value-b.value || b.reached-a.reached || b.source-a.source || b.side-a.side || a.team-b.team)[0];
}

test("baseline Titano e Abisso devono esistere, essere uniche ed esatte",()=>{
  const correct=[{key:"titano",team:10,value:94,current:true},{key:"abisso",team:5,value:31,current:true}];
  assert.equal(validBaselines(correct),true);
  assert.equal(validBaselines(correct.filter(row=>row.key!=="titano")),false);
  assert.equal(validBaselines(correct.filter(row=>row.key!=="abisso")),false);
  assert.equal(validBaselines([{...correct[0],value:95},correct[1]]),false);
  assert.equal(validBaselines([...correct,{...correct[0]}]),false);
  assert.match(sql,/count\(\*\).*emblem_key='titano'.*held_until is null\)<>1/);
  assert.match(sql,/societa_id=10 and record_value=94\)<>1/);
  assert.match(sql,/societa_id=5 and record_value=31\)<>1/);
  assert.match(sql,/DYNAMIC_HOLDER_PROVENANCE_REQUIRED/);
});
function mecenate(rows, activeSeason, incumbent=null) {
  const active=rows.filter(row=>row.season===activeSeason);
  const max=Math.max(...active.map(row=>row.value));
  const leaders=[...new Set(active.filter(row=>row.value===max).map(row=>row.team))];
  if (incumbent!==null && leaders.includes(incumbent.team)) return {team:incumbent.team,value:max};
  if (leaders.length!==1) return incumbent;
  return {team:leaders[0],value:max};
}

test("Titano preserva baseline, riconcilia correzioni e mantiene incumbent in parità",()=>{
  const baseline={team:10,value:94,reached:0,source:0,side:-1};
  assert.equal(titano([baseline],10).team,10);
  assert.equal(titano([baseline,{team:1,value:100},{team:2,value:95}],10).team,1);
  assert.equal(titano([baseline,{team:1,value:80},{team:2,value:95}],1).team,2);
  assert.equal(titano([baseline,{team:1,value:95},{team:2,value:95}],1).team,1);
  assert.match(sql,/v_baseline_team:=case when v_lower then 5 else 10 end/);
  assert.match(sql,/societa_performance_record_sources/);
  assert.doesNotMatch(sql,/game\.updated_at>=v_cutoff/);
  assert.match(sql,/if v_current_team=v_team then[\s\S]*record_value=v_value[\s\S]*continue/);
});

test("Abisso preserva baseline, usa il vero minimo e l'ultima squadra nelle parità",()=>{
  const baseline={team:5,value:31,reached:0,source:0,side:-1};
  assert.equal(abisso([baseline]).team,5);
  assert.equal(abisso([baseline,{team:1,value:20,reached:1,source:1,side:0},{team:2,value:22,reached:2,source:2,side:0}]).team,1);
  assert.equal(abisso([baseline,{team:1,value:30,reached:3,source:1,side:0},{team:2,value:22,reached:2,source:2,side:0}]).team,2);
  assert.equal(abisso([baseline,{team:1,value:20,reached:1,source:1,side:0},{team:2,value:20,reached:2,source:2,side:0}]).team,2);
  assert.match(sql,/case when v_lower then candidate\.reached_at end desc/);
});

test("provenienza stabile esclude vecchie partite modificate oggi e conserva le correzioni delle nuove",()=>{
  const sources=new Map([[1,false]]);
  const historical={id:1,team:9,value:110};historical.value=120;
  const eligible=(rows)=>rows.filter(row=>sources.get(row.id)===true);
  assert.deepEqual(eligible([historical]),[]);
  const recent={id:2,team:1,value:100};sources.set(recent.id,true);
  assert.equal(titano([{team:10,value:94},...eligible([historical,recent])],10).value,100);
  recent.value=80;
  const runner={id:3,team:2,value:95};sources.set(runner.id,true);
  assert.equal(titano([{team:10,value:94},...eligible([historical,recent,runner])],1).team,2);
  const oldLow={id:4,team:8,value:10};sources.set(oldLow.id,false);oldLow.value=5;
  assert.equal(abisso([{team:5,value:31,reached:0,source:0,side:-1},...eligible([oldLow]).map(row=>({...row,reached:9,source:row.id,side:0}))]).team,5);
  assert.match(sql,/old\.stato='calcolata'[\s\S]*values\(new\.id,false\)/);
  assert.match(sql,/source\.eligible/);
});

test("Abisso aggiorna il momento solo quando cambia il valore e separa casa/trasferta",()=>{
  const reached={homeValue:70,awayValue:50,homeAt:1,awayAt:1};
  const observe=(home,away,at)=>{
    if(reached.homeValue!==home){reached.homeValue=home;reached.homeAt=at;}
    if(reached.awayValue!==away){reached.awayValue=away;reached.awayAt=at;}
  };
  const b={team:2,value:31,reached:2,source:2,side:0};
  observe(70,50,3);assert.deepEqual([reached.homeAt,reached.awayAt],[1,1]);
  observe(31,50,4);
  const aHome={team:1,value:31,reached:reached.homeAt,source:1,side:0};
  assert.equal(abisso([b,aHome]).team,1);
  observe(31,31,4);
  const aAway={team:3,value:31,reached:reached.awayAt,source:1,side:1};
  assert.equal(abisso([aHome,aAway]).team,3);
  assert.match(sql,/home_value is distinct from new\.fantapunti_casa/);
  assert.match(sql,/away_value is distinct from new\.fantapunti_trasferta/);
  assert.match(sql,/source\.home_reached_at[\s\S]*source\.away_reached_at/);
});

test("Mecenate considera solo stagione attiva, corregge/rimuove e non inventa leader nei pareggi",()=>{
  const rows=[{season:3,team:9,value:999},{season:4,team:1,value:100},{season:4,team:2,value:95}];
  assert.deepEqual(mecenate(rows,4),{team:1,value:100});
  assert.deepEqual(mecenate(rows.map(row=>row.team===1?{...row,value:90}:row),4),{team:2,value:95});
  assert.deepEqual(mecenate(rows.filter(row=>row.team!==1),4),{team:2,value:95});
  assert.equal(mecenate([...rows,{season:4,team:2,value:100}],4),null);
  assert.deepEqual(mecenate([...rows,{season:4,team:2,value:100}],4,{team:1,value:90}),{team:1,value:100});
  assert.deepEqual(mecenate([{season:4,team:2,value:110},{season:4,team:3,value:110}],4,{team:1,value:100}),{team:1,value:100});
  assert.deepEqual(mecenate([{season:4,team:2,value:110}],4,{team:1,value:100}),{team:2,value:110});
  assert.match(sql,/from public\.rose_giocatori where stagione_id=v_season/);
  assert.match(sql,/if v_count<>1 then return/);
});

test("trigger statement-level riconciliano insert update delete e Idolo resta fuori scope",()=>{
  assert.match(sql,/after insert or delete or update of stato,fantapunti_casa,fantapunti_trasferta/);
  assert.match(sql,/for each statement execute function private\.trigger_sync_societa_performance_holders/);
  assert.doesNotMatch(sql,/create or replace function private\.sync_societa_support_emblems/);
  assert.doesNotMatch(sql,/emblem_key='idolo'/);
});
