import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("static site contains all five core interactive controls",()=>{
 const html=read("docs/index.html");
 for(const id of ['id="brief"','id="analyze"','id="run-model"','id="export"','id="chance"','id="reward"'])
   assert(html.includes(id),id+" missing");
});
test("privacy disclosures distinguish model weights and task content",()=>{
 const html=read("docs/index.html");
 assert(html.includes("not sent to an inference API"));
 assert(html.includes("downloads a public model"));
 assert(html.includes("pricing experiment"));
 assert(!html.includes("guaranteed profit"));
});
test("worker lazy-loads open-weight model in local browser",()=>{
 const src=read("src/ai-worker.mjs");
 assert.match(src,/Xenova\/flan-t5-small/);
 assert.match(src,/pipeline\("text2text-generation"/);
 assert.match(src,/self\.onmessage=/);
 assert.match(src,/device:"wasm"/);
 assert.match(src,/env\.allowRemoteModels = true/);
 assert(!src.includes("fetch('https://api.openai.com"));
});
test("site includes local WASM engine and bundled worker",()=>{
 for(const asset of ["docs/assets/app.js","docs/assets/ai-worker.js","docs/assets/styles.css",
   "docs/assets/ort/ort-wasm-simd-threaded.mjs","docs/assets/ort/ort-wasm-simd-threaded.wasm"])
    assert(fs.statSync(path.join(root,asset)).size>0,asset+" missing/empty");
});
test("open site is canonical, no external payment SDK or key request",()=>{
 const html=read("docs/index.html");
 assert(html.includes('rel="canonical" href="https://livastic-vm2-primary-20260911.github.io/taskproof-ai/"'));
 assert(!/Stripe\.js|checkout\.stripe\.com|connectWallet\(/.test(html));
 assert(html.includes("No checkout, no promises"));
});

test("decorative background is disabled on narrow screens to prevent overflow",()=>{
 const css=read("src/styles.css");
 assert.match(css,/@media\(max-width:750px\)\{\.ambient\{display:none\}/);
});
