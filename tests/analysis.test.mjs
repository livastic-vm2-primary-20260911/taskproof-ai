import { test } from "node:test";
import assert from "node:assert/strict";
import {analyzeBrief,economics,makeEvidencePlan} from "../src/analysis.mjs";
const sample="Bounty 100 USDC. Build a live demo, public GitHub repo with README and tests. One winner; submit before the deadline.";
test("empty and oversized brief fail",()=>{
 assert.throws(()=>analyzeBrief(" "),/Paste/);
 assert.throws(()=>analyzeBrief("x".repeat(12001)),/Maximum/);
});
test("detects repository, live demo, documentation and test proof",()=>{
 const x=analyzeBrief(sample);
 for(const key of ["repository","live-demo","documentation","test"])assert(x.evidence.some(y=>y.id===key));
});
test("detects explicit critical private-key demands",()=>{
 const x=analyzeBrief(sample+" Send your private keys as a condition for payment.");
 assert.equal(x.critical,true);
 assert(x.risks.some(y=>y.id==="keys"&&y.severity==="critical"));
});
test("negative precautions are not counted as demands",()=>{
 assert.equal(analyzeBrief(sample+" No upfront fees, no credentials. Never send private keys.").critical,false);
});
test("competition is a risk not a payout guarantee",()=>{
 const x=analyzeBrief("Winner gets 500 USD. Judges choose the best project.");
 assert(x.risks.some(r=>r.id==="subjective"));
});
test("deposit demand is critical",()=>{
 assert(analyzeBrief("Pay entry fee to qualify for project").critical);
});
test("closed deterministic brief has no fabricated actual payouts",()=>{
 const x=analyzeBrief("Write a README for a CLI, deliver it as a public repo and a test script.");
 assert.equal(x.critical,false);
 assert(x.questions.some(q=>/amount/.test(q)));
});
test("evidence categories don't duplicate",()=>{
 const ids=analyzeBrief("You must provide a demo video and an mp4 video.").evidence.map(e=>e.id);
 assert.equal(ids.filter(x=>x==="video").length,1);
});
test("full realistic evidence extraction",()=>{
 const ids=analyzeBrief("Publish a blog post on Medium with an original screenshot and a tx hash on Basescan.").evidence.map(x=>x.id);
 for(const x of ["writing","image","chain"]) assert(ids.includes(x));
});
test("probability-weighted economics",()=>{
 const m=economics({rewardUsd:100,feePct:10,hours:5,chancePct:20,costsUsd:2});
 assert.equal(m.payoutIfSelected,90);
 assert.equal(m.expectedGross,18);
 assert.equal(m.expectedNet,16);
 assert.equal(m.expectedHourly,3.2);
 assert.equal(m.selectedHourly,17.6);
});
test("probability zero never creates expected winnings",()=>{
 const m=economics({rewardUsd:500,feePct:0,hours:2,chancePct:0,costsUsd:0});
 assert.equal(m.expectedGross,0);
 assert.equal(m.expectedNet,0);
});
test("fees and costs can produce negative expectation",()=>{
 const m=economics({rewardUsd:10,feePct:50,hours:2,chancePct:10,costsUsd:5});
 assert.equal(m.expectedNet,-4.5);
 assert.equal(m.expectedHourly,-2.25);
});
test("zero-payout no artificial break-even",()=>{
 const m=economics({rewardUsd:0,feePct:0,hours:3,chancePct:70,costsUsd:0});
 assert.equal(m.breakEvenChancePct,null);
});
test("validates percentage ranges and hours",()=>{
 for(const payload of [{rewardUsd:-1,hours:1},{rewardUsd:1,hours:0},{rewardUsd:1,hours:1,feePct:110},{rewardUsd:1,hours:1,chancePct:-5}])
  assert.throws(()=>economics(payload),/out of range/);
});
test("invalid numbers cannot become infinity or NaN",()=>{
 assert.throws(()=>economics({rewardUsd:Infinity,hours:1}),/finite/);
 assert.throws(()=>economics({rewardUsd:"oops",hours:1}),/finite/);
});
test("report marks guesses and includes detailed evidence",()=>{
 const r=makeEvidencePlan(sample,{rewardUsd:100,feePct:7.5,hours:4,chancePct:10,costsUsd:0},"AI evidence outline subject to manual check");
 assert.match(r,/your estimate/);
 assert.match(r,/public repository link/);
 assert.match(r,/AI evidence outline/);
 assert.match(r,/No client details/);
 assert.match(r,/No payout or eligibility has been verified|no payout or eligibility has been verified/i);
});
test("questions are never duplicated",()=>{
 const x=analyzeBrief("Win the contest prize. Judges choose winner. Publish on Twitter by deadline.");
 assert.equal(new Set(x.questions).size,x.questions.length);
});
