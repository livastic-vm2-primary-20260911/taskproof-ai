const pick = (text, expression) => expression.test(text);
const unique = items => [...new Set(items)];

export const EVIDENCE_RULES = [
  {id:"repository", label:"Source repository / commit", pattern:/\b(?:github|gitlab|source (?:code|repo)|repository|pull request|\bPR\b|commit sha|public repo)\b/i, prompt:"A public repository link and exact revision or accepted PR"},
  {id:"live-demo", label:"Working public demo", pattern:/\b(?:live demo|public (?:url|game|site)|deployed|public link|hosted|live app|playable|web app)\b/i, prompt:"A reachable public URL with a reproducible happy-path demo"},
  {id:"test", label:"Tests / verification", pattern:/\b(?:test(?:ed|ing|s)?|pytest|unit test|acceptance|CI result|benchmark|proof|reproducible)\b/i, prompt:"A reproducible test command and its actual output"},
  {id:"video", label:"Video proof", pattern:/\b(?:video|screen ?record(?:ing)?|mp4|walkthrough|demo clip|animated infographic)\b/i, prompt:"A short recorded demonstration made for this delivery"},
  {id:"image", label:"Original visual", pattern:/\b(?:screenshot|image|infographic|illustration|visual|logo|thumbnail)\b/i, prompt:"An original licensed visual matching the requirements"},
  {id:"writing", label:"Published write-up", pattern:/\b(?:write.?up|blog post|article|publish|thread|tweet|social post|dev\.to|medium|newsletter)\b/i, prompt:"A permalink to the published original text, with required disclosures"},
  {id:"chain", label:"Transaction evidence", pattern:/\b(?:tx hash|transaction hash|block number|block explorer|on.?chain|receipt|etherscan|basescan|bscscan|solscan)\b/i, prompt:"A public explorer link, network, transaction hash and independent readback"},
  {id:"documentation", label:"Documentation", pattern:/\b(?:readme|documentation|api docs|usage guide|installation guide|setup instructions)\b/i, prompt:"A precise README with setup and reproduction steps"},
];

const RISK_RULES = [
  {id:"deposit",severity:"critical",title:"Upfront payment or deposit requested",re:/\b(?:pay (?:an? |the )?(?:entry )?(?:fee|gas|upfront)|deposit of (?:\$|[0-9])|(?:deposit|upfront fee) (?:is )?required|purchase (?:to |before )?(?:apply|qualify)|fund (?:your |the )?wallet|mint to qualify|prepay)\b/i,why:"A speculative opportunity that needs money before verified work may create an uncompensated loss."},
  {id:"keys",severity:"critical",title:"Credential or recovery-secret request",re:/\b(?:(?:send|share|upload|submit|provide|export) (?:your |the )?(?:seed phrases?|recovery phrases?|private keys?|api key|password)|(?:seed phrases?|recovery phrases?|private keys?) (?:are |is )?(?:required|needed))\b/i,why:"Never provide credentials or recovery material as part of a bounty."},
  {id:"social",severity:"medium",title:"External social publishing required",re:/\b(?:twitter|post on x\b|x\.com|farcaster|bluesky|tiktok|instagram|social media|medium\.com)\b/i,why:"Make sure you actually have the authorized account and required reach before accepting."},
  {id:"login",severity:"medium",title:"External identity or access requirement",re:/\b(?:kyc|verified identity|government.?id|legal name|tax form|exclusive access|invite only|sign in with|account required|api key)\b/i,why:"Confirm qualification and access before doing speculative work."},
  {id:"subjective",severity:"medium",title:"Subjective acceptance or winner selection",re:/\b(?:winner|judg(?:es|ing)|selected best|competition|contest|prize|only one winner|discretion|subjective)\b/i,why:"Completing the deliverable does not guarantee selection or payment."},
  {id:"refund",severity:"medium",title:"Dispute or withheld payout terms",re:/\b(?:dispute window|refund|held in escrow|escrow|payout review|approval required|payment after review)\b/i,why:"An escrow or advertised amount is not a confirmed payment receipt."},
  {id:"urgency",severity:"note",title:"Time-sensitive requirement",re:/\b(?:deadline|expires|due by|within (?:24|48|72) hours|today only|tonight)\b/i,why:"Confirm the exact timezone and whether the posting is still open."}
];

export function analyzeBrief(text) {
  if (typeof text !== "string" || !text.trim()) throw new TypeError("Paste a task description first.");
  if (text.length > 12000) throw new RangeError("Maximum brief size is 12,000 characters.");
  const evidence = EVIDENCE_RULES.filter(r=>pick(text,r.pattern)).map(({id,label,prompt})=>({id,label,prompt}));
  const riskIsAsserted=rule=>{
    if(rule.id!=="keys")return rule.re.test(text);
    return text.split(/[.!?\n]/).some(fragment=>
      rule.re.test(fragment) &&
      !/\b(?:never|do not|don't|dont|should not|shouldn't|without)\s+(?:send|share|upload|submit|provide|export)\b/i.test(fragment)
    );
  };
  const risks = RISK_RULES.filter(r=>riskIsAsserted(r)).map(({id,severity,title,why})=>({id,severity,title,why}));
  const questions = [];
  if(!/\b(?:\$|usd\b|usdc\b|\bpay(?:ment)?\b|bounty|reward|budget|compensation|honorarium)\b/i.test(text)) questions.push("What exact amount and currency will be paid for accepted work?");
  if(!/\b(?:deadline|expires|due by|oct\b|nov\b|20\d{2}-\d{2}-\d{2}|until \w+)\b/i.test(text)) questions.push("What is the exact deadline, timezone, and submission method?");
  if(!/\b(?:acceptance|accepted if|criteria|deliverables|judges|winner|review process|approve|verification)\b/i.test(text)) questions.push("Who accepts the work, by what objective test, and when?");
  if(!/\b(?:escrow|paid on|payment after|wire transfer|bank transfer|usdc|invoice|payout|settlement)\b/i.test(text)) questions.push("What payment mechanism is verifiable, and when will it settle?");
  if(evidence.length===0) questions.push("What artifact and independently checkable proof must be submitted?");
  if(risks.some(x=>x.id==="social")) questions.push("Are the required publishing accounts already owned and permitted for this use?");
  if(risks.some(x=>x.id==="subjective")) questions.push("How many entrants compete, and is any work paid if not selected?");
  const critical=risks.some(r=>r.severity==="critical");
  return {evidence,risks,questions:unique(questions),critical,sourceLength:text.length};
}
function number(value,defaultValue=0) {
  if(value===undefined||value===null||value==="")return defaultValue;
  const n=Number(value);if(!Number.isFinite(n))throw new TypeError("Use finite numeric values.");
  return n;
}
export function economics(inputs) {
  const rewardUsd=number(inputs.rewardUsd);
  const feePct=number(inputs.feePct);
  const hours=number(inputs.hours,1);
  const chancePct=number(inputs.chancePct,25);
  const costsUsd=number(inputs.costsUsd);
  if(rewardUsd<0||rewardUsd>1e9||feePct<0||feePct>100||hours<=0||hours>5000||chancePct<0||chancePct>100||costsUsd<0||costsUsd>1e9)
    throw new RangeError("Inputs out of range. Reward/cost >=0; fees and probability 0–100; hours >0.");
  const payoutIfSelected=rewardUsd*(1-feePct/100);
  const expectedGross=payoutIfSelected*(chancePct/100);
  const expectedNet=expectedGross-costsUsd;
  const expectedHourly=expectedNet/hours;
  const selectedHourly=(payoutIfSelected-costsUsd)/hours;
  const breakEvenChancePct=payoutIfSelected>0 ? Math.min(100,100*costsUsd/payoutIfSelected) : null;
  return {rewardUsd,feePct,hours,chancePct,costsUsd,payoutIfSelected,expectedGross,expectedNet,expectedHourly,selectedHourly,breakEvenChancePct};
}
export function makeEvidencePlan(brief,metrics,modelNotes="") {
  const result=analyzeBrief(brief);
  const m=economics(metrics);
  const rows=[
   "# TASKPROOF — Bid / Bounty Evidence Plan",
   "",
   "_Local planning artifact only; no payout or eligibility has been verified._",
   "",
   "## User assumptions (not third-party facts)",
   "- Listed reward: $"+m.rewardUsd.toFixed(2),
   "- Fees: "+m.feePct.toFixed(1)+"%",
   "- Work estimate: "+m.hours.toFixed(1)+" hours",
   "- Estimated selection probability: "+m.chancePct.toFixed(1)+"% (your estimate, NOT derived from contest data)",
   "- Upfront costs: $"+m.costsUsd.toFixed(2),
   "- Net payout if selected: $"+m.payoutIfSelected.toFixed(2),
   "- Hypothetical probability-weighted net: $"+m.expectedNet.toFixed(2),
   "- Hypothetical return per hour: $"+m.expectedHourly.toFixed(2),
   "",
   "## Suggested evidence to prepare",
   ...(result.evidence.length ? result.evidence.map(x=>"- [ ] "+x.prompt) : ["- [ ] Request an objective deliverable and proof standard."]),
   "",
   "## Potential risks (heuristic, verify manually)",
   ...(result.risks.length?result.risks.map(x=>"- "+x.title+": "+x.why):["- No included risk patterns matched. This does not establish safety or payment reliability."]),
   "",
   "## Questions before work",
   ...(result.questions.length?result.questions.map(x=>"- "+x):["- Confirm eligibility, payment rights, acceptance criteria and deadline independently."]),
  ];
  if(modelNotes.trim())rows.push("","## Local open-weight AI interpretation (verify manually)",modelNotes.trim());
  rows.push("","## Brief excerpt (provided locally by operator)",brief.slice(0,6000),"",
    "No client details or briefs are sent by this application to a hosted inference API. Model weights may be downloaded on first run.",
    "Generated by TaskProof (open-weight FLAN-T5 + transparent math).");
  return rows.join("\n");
}
