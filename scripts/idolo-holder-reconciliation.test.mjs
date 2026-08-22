import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql=await readFile(new URL("../supabase/migrations/202608220003_authoritative_idolo_holder.sql",import.meta.url),"utf8");
function elect(counts,incumbent=null){
  const max=Math.max(0,...counts.map(row=>row.count));
  if(!max)return incumbent;
  if(counts.some(row=>row.team===incumbent?.team&&row.count===max))return {...incumbent,value:max};
  const leaders=counts.filter(row=>row.count===max).sort((a,b)=>b.reached-a.reached||a.team-b.team);
  return {team:leaders[0].team,value:max};
}
function syncLeaderState(previous,counts,now){
  const next=new Map(previous);const max=Math.max(0,...counts.map(row=>row.count));
  for(const row of counts){const old=next.get(row.team);const atMax=max>0&&row.count===max;next.set(row.team,{count:row.count,atMax,reached:atMax&&(!old?.atMax||old.count!==row.count)?now:old?.reached??null});}
  for(const [team,old] of next)if(!counts.some(row=>row.team===team))next.set(team,{...old,count:0,atMax:false});
  return next;
}
function seedLeaderState(counts){
  const max=Math.max(0,...counts.map(row=>row.count));
  return new Map(counts.map(row=>[row.team,{count:row.count,atMax:row.count===max,reached:row.count===max?row.selectedAt:null}]));
}
function reconcileHistory(current,team,season,value){
  if(current?.team===team&&current.season===season)return {closed:[],current:{...current,value}};
  return {closed:current?[current]:[],current:{team,season,value}};
}

test("incumbent inferiore non resta holder quando due leader sono pari sopra",()=>{
  assert.deepEqual(elect([{team:1,count:5,reached:1},{team:2,count:6,reached:3},{team:3,count:6,reached:2}],{team:1,value:5}),{team:2,value:6});
});
test("incumbent al massimo resta holder in parità",()=>{
  assert.deepEqual(elect([{team:1,count:6,reached:1},{team:2,count:6,reached:3}],{team:1,value:5}),{team:1,value:6});
});
test("provenance del massimo segue supporto ed eleggibilità, non selected_at storico",()=>{
  const oldSelectedAt=-100;
  let state=new Map();
  state=syncLeaderState(state,[{team:2,count:5},{team:3,count:6}],1);
  state=syncLeaderState(state,[{team:2,count:6},{team:3,count:6}],2);
  assert.equal(state.get(2).reached,2);
  assert.notEqual(state.get(2).reached,oldSelectedAt);
  assert.ok(state.get(2).reached>state.get(3).reached);
  state=syncLeaderState(state,[{team:2,count:5},{team:3,count:6}],3);
  state=syncLeaderState(state,[{team:2,count:6},{team:3,count:6}],4);
  assert.equal(state.get(2).reached,4);
  const unchanged=syncLeaderState(state,[{team:2,count:6},{team:3,count:6}],5);
  assert.equal(unchanged.get(2).reached,4);
  const runtimeSync=sql.slice(
    sql.indexOf("create or replace function private.sync_societa_idolo_holder"),
    sql.indexOf("create or replace function private.trigger_sync_societa_idolo_holder"),
  );
  assert.match(runtimeSync,/on conflict[\s\S]*supporter_count is distinct from excluded\.supporter_count\) then v_now/);
  assert.match(sql,/not state\.is_at_max or state\.supporter_count is distinct from excluded\.supporter_count/);
});
test("seed iniziale preserva selected_at storico e usa societa_id solo a timestamp identico",()=>{
  const incumbent={team:1,value:5};
  let state=seedLeaderState([{team:1,count:5,selectedAt:1},{team:2,count:6,selectedAt:5},{team:3,count:6,selectedAt:3}]);
  assert.equal(elect([...state].map(([team,row])=>({team,count:row.count,reached:row.reached})),incumbent).team,2);
  state=seedLeaderState([{team:1,count:5,selectedAt:1},{team:2,count:6,selectedAt:3},{team:3,count:6,selectedAt:5}]);
  assert.equal(elect([...state].map(([team,row])=>({team,count:row.count,reached:row.reached})),incumbent).team,3);
  state=seedLeaderState([{team:1,count:5,selectedAt:1},{team:2,count:6,selectedAt:5},{team:3,count:6,selectedAt:5}]);
  assert.equal(elect([...state].map(([team,row])=>({team,count:row.count,reached:row.reached})),incumbent).team,2);
  assert.match(sql,/historical_reach[\s\S]*max\(support\.selected_at\)/);
  assert.match(sql,/profile\.societa_id is null[\s\S]*profile_support_ineligibilities/);
});
test("incumbent co-leader prevale anche sul seed storico",()=>{
  const state=seedLeaderState([{team:1,count:6,selectedAt:1},{team:2,count:6,selectedAt:5}]);
  assert.equal(elect([...state].map(([team,row])=>({team,count:row.count,reached:row.reached})),{team:1,value:6}).team,1);
});
test("prima sync di una nuova stagione usa il tie-break storico",()=>{
  let state=seedLeaderState([{team:2,count:6,selectedAt:3},{team:3,count:6,selectedAt:5}]);
  assert.equal(elect([...state].map(([team,row])=>({team,count:row.count,reached:row.reached}))).team,3);
  state=seedLeaderState([]);
  assert.equal(elect([],null),null);
  assert.equal(state.size,0);
  assert.match(sql,/select exists\(select 1 from private\.societa_idolo_leader_state where stagione_id=v_season\) into v_has_state/);
  assert.match(sql,/when not v_has_state then historical\.reached_at[\s\S]*else v_now/);
});
test("dopo il seed stagionale le variazioni continuano a usare il tempo corrente",()=>{
  const seeded=seedLeaderState([{team:2,count:6,selectedAt:-100},{team:3,count:5,selectedAt:-200}]);
  const changed=syncLeaderState(seeded,[{team:2,count:6},{team:3,count:6}],10);
  assert.equal(changed.get(3).reached,10);
  assert.notEqual(changed.get(3).reached,-200);
  const unchanged=syncLeaderState(changed,[{team:2,count:6},{team:3,count:6}],11);
  assert.equal(unchanged.get(3).reached,10);
});
test("leader unico, perdita tifosi, cambio supporto e perdita eleggibilità ricalcolano",()=>{
  assert.equal(elect([{team:1,count:5,reached:1},{team:2,count:6,reached:2}],{team:1,value:5}).team,2);
  assert.equal(elect([{team:1,count:4,reached:1},{team:2,count:5,reached:2}],{team:1,value:5}).team,2);
  assert.equal(elect([{team:1,count:4,reached:1},{team:2,count:3,reached:2},{team:3,count:5,reached:3}],{team:2,value:5}).team,3);
  assert.match(sql,/after insert or update or delete on public\.profile_supports/);
  assert.match(sql,/profile_support_ineligibilities[\s\S]*after insert or update or delete/);
  assert.match(sql,/after update of societa_id on public\.profiles/);
});
test("sync identica e solo record_value cambiato non duplicano history",()=>{
  assert.match(sql,/if v_current_team is not null and exists[\s\S]*update public\.societa_emblem_holder_history set record_value=v_max[\s\S]*return/);
  assert.match(sql,/record_value is distinct from v_max/);
});
test("history Idolo apre una nuova detenzione al cambio stagione",()=>{
  const sameTeam=reconcileHistory({team:1,season:4,value:5},1,5,6);
  assert.deepEqual(sameTeam,{closed:[{team:1,season:4,value:5}],current:{team:1,season:5,value:6}});
  const changedTeam=reconcileHistory({team:1,season:4,value:5},2,5,6);
  assert.deepEqual(changedTeam,{closed:[{team:1,season:4,value:5}],current:{team:2,season:5,value:6}});
  assert.match(sql,/if v_current_season is distinct from v_season then[\s\S]*set held_until=v_now[\s\S]*values\('idolo',v_current_team,v_season,v_max\)/);
});
test("history Idolo resta idempotente nella stessa stagione",()=>{
  const unchanged=reconcileHistory({team:1,season:5,value:6},1,5,6);
  assert.deepEqual(unchanged,{closed:[],current:{team:1,season:5,value:6}});
  const recordChanged=reconcileHistory({team:1,season:5,value:5},1,5,6);
  assert.deepEqual(recordChanged,{closed:[],current:{team:1,season:5,value:6}});
  assert.match(sql,/where emblem_key='idolo' and held_until is null and record_value is distinct from v_max/);
});
test("nessun leader conserva il comportamento precedente",()=>{
  const incumbent={team:1,value:5};assert.deepEqual(elect([],incumbent),incumbent);
  assert.match(sql,/if coalesce\(v_max,0\)=0 then return/);
});
test("nuova stagione attiva, update e delete richiamano la sync",()=>{
  assert.match(sql,/after insert or delete or update of attiva on public\.stagioni/);
});
test("migration è confinata a Idolo",()=>{
  for(const key of ["titano","abisso","mecenate"])assert.doesNotMatch(sql,new RegExp(`emblem_key='${key}'`));
  assert.doesNotMatch(sql,/societa_emblem_unlocks|fantabet|partite/);
});
