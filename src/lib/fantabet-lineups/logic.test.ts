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

test("fallback OCR riconosce sostituzione omissione errore interno e trasposizione",()=>{
  for(const [actual,read] of [["Carnesecchi","Carnececchi"],["Diouf","Diuf"],["Diouf","Dioouf"],["Mendy P.","Mendi P"],["Ghedjemis","Ghediemis"],["Helland","Heland"],["Chukwueze","Chukweeze"],["Baturina","Bautrina"]]){
    const result=matchPlayer(read,[{id:1,name:actual,role:"C"}]);
    assert.equal(result.status,"recognized",`${read} -> ${actual}`);
    assert.equal(result.playerId,1);
  }
});

test("matcher esistente conserva priorità su exact prefix token e containment",()=>{
  assert.equal(matchPlayer("Solet",[{id:1,name:"Solet",role:"D"},{id:2,name:"Solex",role:"D"}]).playerId,1);
  assert.equal(matchPlayer("Vitinha Oli",[{id:1,name:"Vitinha Oliveira",role:"C"},{id:2,name:"Vitinha Pereira",role:"C"}]).playerId,1);
  assert.equal(matchPlayer("VitinhaO",[{id:1,name:"Vitinha Oliveira",role:"C"},{id:2,name:"Vitinhap",role:"C"}]).playerId,1);
});

test("fallback OCR resta conservativa per distanza lunghezza e unicità",()=>{
  assert.equal(matchPlayer("Carnxxecchi",[{id:1,name:"Carnesecchi",role:"P"}]).status,"unrecognized");
  assert.equal(matchPlayer("Dio",[{id:1,name:"Diao",role:"C"}]).status,"unrecognized");
  const ambiguous=matchPlayer("Playerx",[{id:1,name:"Playera",role:"C"},{id:2,name:"Playerb",role:"C"}]);
  assert.equal(ambiguous.status,"ambiguous");
  assert.deepEqual(ambiguous.candidates,[1,2]);
  assert.equal(matchPlayer("Nessuno",[{id:1,name:"Carnesecchi",role:"P"}]).status,"unrecognized");
});

test("fallback automatica non consulta rosa avversaria o catalogo lega",()=>{
  const own=[{id:1,name:"Carnesecchi",role:"P",societyId:7,societyName:"Interstellar"}];
  const opponent=[{id:2,name:"Chukwueze",role:"C",societyId:1,societyName:"Kung Fu Parma"}];
  const isolatedOptions:TeamOption[]=[{id:7,name:"Interstellar",aliases:[],roster:own,leaguePlayers:[...own,...opponent]},{id:1,name:"Kung Fu Parma",aliases:[],roster:opponent,leaguePlayers:[...own,...opponent]}];
  const preview=buildLineupPreview({teamA:{detectedName:"Interstellar",formation:null,players:["Chukweeze"]},teamB:{detectedName:"Kung Fu Parma",formation:null,players:["Carnesecchx"]}},99,1,2,isolatedOptions as [TeamOption,TeamOption]);
  assert.equal(preview.teams[0].players[0].status,"unrecognized");
  assert.equal(preview.teams[1].players[0].status,"unrecognized");
});

test("campione audit passa da 16 riconosciuti e 6 sconosciuti a 22 riconosciuti",()=>{
  const sample=[["Carnesecchi","Carnececchi"],["Solet","Solet"],["Stones","Stones"],["Valeri","Valeri"],["Valle","Valle"],["Colpani","Colpani"],["Diouf","Diuf"],["Volpato","Volpato"],["Yeboah J.","Yeboah J"],["Mendy P.","Mendi P"],["Ghilardi","Ghilardi"],["Ghedjemis","Ghediemis"],["Malen","Malen"],["Diao","Diao"],["Baturina","Baturina"],["Calò","Calo"],["Vojvoda","Vojvoda"],["Helland","Heland"],["Troilo","Troilo"],["Obert","Obert"],["Muric","Muric"],["Chukwueze","Chukweeze"]];
  const results=sample.map(([actual,read],index)=>matchPlayer(read,[{id:index+1,name:actual,role:"C"}]));
  assert.deepEqual({recognized:results.filter((result)=>result.status==="recognized").length,ambiguous:results.filter((result)=>result.status==="ambiguous").length,unrecognized:results.filter((result)=>result.status==="unrecognized").length},{recognized:22,ambiguous:0,unrecognized:0});
});
