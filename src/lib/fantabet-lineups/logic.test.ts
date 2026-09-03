import assert from "node:assert/strict";
import test from "node:test";
import { buildLineupPreview, matchPlayer, normalizeRecognitionName, parseRecognitionOutput, validateConfirmation } from "./logic.ts";
import type { ConfirmLineupInput, TeamOption } from "./types.ts";

const roster=Array.from({length:12},(_,i)=>({id:i+1,name:i===0?"Vitinha Oliveira":i===1?"Nico Paz":i===2?"Juan Rodriguez":`Giocatore ${i+1}`,role:i===0?"P":"D",societyId:7,societyName:"Interstellar"}));
const outside={id:101,name:"Nuovo Ceduto",role:"A",societyId:1,societyName:"Kung Fu Parma",realTeam:"Roma"};
const otherRoster=[outside,...roster.slice(1).map((p)=>({...p,id:p.id+100,societyId:1}))];
const options:TeamOption[]=[{id:7,name:"Interstellar",aliases:["inter stellar"],leagueCode:"serie-a",roster,leaguePlayers:[...roster,...otherRoster]},{id:1,name:"Kung Fu Parma",aliases:[],leagueCode:"serie-a",roster:otherRoster,leaguePlayers:[...roster,...otherRoster]}];
const slots=roster.slice(0,11).map((p)=>({source:"roster" as const,rosterPlayerId:p.id}));
const valid:ConfirmLineupInput={matchId:99,seasonId:1,matchday:2,teams:[{societyId:7,formation:"4-3-3",players:slots,captainOrder:1,viceCaptainOrder:2},{societyId:1,formation:null,players:options[1].roster.slice(0,11).map((p)=>({source:"roster",rosterPlayerId:p.id})),captainOrder:1,viceCaptainOrder:2}]};

test("normalizza accenti apostrofi punti e spazi",()=>assert.equal(normalizeRecognitionName("  D’Àngelo N. "),"d angelo n"));
test("riconosce abbreviazione con iniziale",()=>assert.equal(matchPlayer("Vitinha O.",roster).playerId,1));
test("segnala sconosciuto e ambiguo",()=>{assert.equal(matchPlayer("Nessuno X",roster).status,"unrecognized");assert.equal(matchPlayer("Mario",[{id:1,name:"Mario Rossi",role:"D"},{id:2,name:"Mario Bianchi",role:"C"}]).status,"ambiguous");});
test("output recognition strutturato",()=>assert.equal(parseRecognitionOutput({teamA:{detectedName:"A",formation:"4-3-3",players:["Uno"]},teamB:{detectedName:"B",formation:null,players:["Due"]}}).teamA.formation,"4-3-3"));
test("matching automatico resta limitato alla rosa",()=>{const preview=buildLineupPreview({teamA:{detectedName:"Inter Stellar",formation:null,players:["Nuovo Ceduto"]},teamB:{detectedName:"Kung Fu Parma",formation:null,players:["Nuovo Ceduto"]}},99,1,2,options as [TeamOption,TeamOption]);assert.equal(preview.teams[0].players[0].slot,null);assert.equal(preview.teams[1].players[0].playerId,101);});
test("11 in rosa passano",()=>assert.equal(validateConfirmation(valid,options),null));
test("fuori rosa con override passa",()=>{const input=structuredClone(valid);input.teams[0].players[10]={source:"roster",rosterPlayerId:101,overrideConfirmed:true};assert.equal(validateConfirmation(input,options),null);});
test("fuori rosa senza override blocca",()=>{const input=structuredClone(valid);input.teams[0].players[10]={source:"roster",rosterPlayerId:101};assert.match(validateConfirmation(input,options)!,/override/);});
test("manuale valido passa",()=>{const input=structuredClone(valid);input.teams[0].players[10]={source:"manual",player:"Appena Arrivato",role:"A",overrideConfirmed:true};assert.equal(validateConfirmation(input,options),null);});
test("manuale invalido blocca",()=>{for(const slot of [{source:"manual",player:"",role:"A",overrideConfirmed:true},{source:"manual",player:"X".repeat(121),role:"A",overrideConfirmed:true},{source:"manual",player:"Nuovo",role:"X",overrideConfirmed:true},{source:"manual",player:"Nuovo",role:"A",overrideConfirmed:false}] as const){const input=structuredClone(valid);input.teams[0].players[10]=slot as never;assert.ok(validateConfirmation(input,options));}});
test("unresolved blocca",()=>{const input=structuredClone(valid);input.teams[0].players[10]=null;assert.match(validateConfirmation(input,options)!,/risolti/);});
test("duplicati roster manual e misti bloccano",()=>{const cases=[{source:"roster",rosterPlayerId:1},{source:"manual",player:"Manuale",role:"A",overrideConfirmed:true},{source:"manual",player:"Vitinha Oliveira",role:"A",overrideConfirmed:true}] as const;for(const slot of cases){const input=structuredClone(valid);if(slot.source==="manual"&&slot.player==="Manuale")input.teams[0].players[9]={...slot};input.teams[0].players[10]={...slot};assert.match(validateConfirmation(input,options)!,/stesso/);}});
test("capitano e vice devono essere posizioni valide e distinte",()=>{for(const patch of [{captainOrder:0},{captainOrder:12},{viceCaptainOrder:12},{captainOrder:2,viceCaptainOrder:2}]){const input=structuredClone(valid);Object.assign(input.teams[0],patch);assert.ok(validateConfirmation(input,options));}});
