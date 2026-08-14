import test from "node:test";
import assert from "node:assert/strict";
import { safeAccountReturnUrl } from "./return-url.ts";
test("preserva pagine interne query e hash",()=>{for(const path of ["/","/campionati","/coppe","/societa/interstellar","/fantabet?round=3#classifica-fantabet"])assert.equal(safeAccountReturnUrl(path),path)});
test("rifiuta open redirect e destinazioni login ricorsive",()=>{for(const path of ["https://evil.test","//evil.test","/\\evil.test","/account/accedi?returnTo=/"])assert.equal(safeAccountReturnUrl(path,"/account"),"/account")});
test("fallback resta operativo",()=>assert.equal(safeAccountReturnUrl(undefined,"/account"),"/account"));
