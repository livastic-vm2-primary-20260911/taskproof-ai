import {analyzeBrief,economics,makeEvidencePlan} from "./analysis.mjs";

const $=id=>document.getElementById(id);
const brief=$("brief");
const loading=$("ai-progress");
const stage=$("model-stage");
const btnAI=$("run-model");
const btnScan=$("analyze");
const chance=$("chance");
const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});
const formInputs=["reward","fees","hours","costs","chance"];
const getInputs=()=>({rewardUsd:$("reward").value,feePct:$("fees").value,hours:$("hours").value,costsUsd:$("costs").value,chancePct:chance.value});
const exampleContest=`Build a fun multiplayer turn-based game for humans and AI agents. Only the single winner earns a 500 USD prize. Judging: creativity, playable polished live demo, and stability. Public GitHub source repo with README, HTTP API documentation, one sample bot, match replay and test results required. Deadline: October 18, 2026, 11:59 PM PDT. Payout is subject to review. No upfront fees, no credentials, and no guaranteed selection.`;
const exampleClient=`A small independent shop needs a local CSV cleaner with a browser demo. Fixed fee $120 USD after acceptance. Deliver a GitHub repository, a short README explaining CSV mapping, and 3 unit tests demonstrating empty rows, invalid numbers and export. Scope is one CSV layout. Access to production customer data is not required. Agree on acceptance criteria, authorized sample files and settlement method before starting.`;

let lastAnalysis=null;
let lastAI=null;
let lastBrief=null;
let worker=null;
let seq=0;
function el(tag,className,text) {
  const x=document.createElement(tag);
  if(className)x.className=className;
  if(text!==undefined)x.textContent=text;
  return x;
}
function appendText(parent,tag,cl,text) {
 const x=el(tag,cl,text);parent.append(x);return x;
}
function resetAI() {
  lastAI=null;
  $("ai-idle").hidden=false;
  $("ai-result").hidden=true;
  $("ai-error").hidden=true;
  loading.hidden=true;
  stage.textContent="NOT LOADED";
  btnAI.disabled=false;
}
function noteEmpty(msg) {
  const x=$("empty-report");
  x.hidden=false;
  x.replaceChildren(
    el("span","empty-glyph","◎"),
    el("h3","",msg||"A listing isn't a receipt."),
    el("p","","Review the requirements and payment evidence. Pasting a brief cannot establish whether a buyer is genuine or solvent.")
  );
  $("report").hidden=true;
  lastAnalysis=null;
}
function currency(n){return money.format(Number(n)||0);}
function renderEconomics() {
 try{
  const e=economics(getInputs());
  $("ev").textContent=currency(e.expectedNet);
  $("hourly").textContent=currency(e.expectedHourly)+"/h";
  $("selected").textContent=currency(e.payoutIfSelected-e.costsUsd);
  $("after-fee").textContent=currency(e.payoutIfSelected);
  $("breakeven").textContent=e.breakEvenChancePct===null?"N/A":e.breakEvenChancePct.toFixed(1)+"%";
  $("ev-caption").textContent="Hypothetical calculation; no payment received";
  $("ev").style.color=e.expectedNet<0?"#8e3d36":"";
 }catch(error){
  $("ev").textContent="Check inputs";
  $("ev-caption").textContent=String(error.message||error);
 }
 const pct=Number(chance.value);
 $("chance-label").textContent=pct+"%";
 chance.style.background="linear-gradient(90deg,var(--mint) "+pct+"%,#406266 "+pct+"%)";
}
function renderReport() {
  const text=brief.value;
  $("char-count").textContent=text.length.toLocaleString()+" / 12,000";
  try{
    const data=analyzeBrief(text);
    lastAnalysis=data;
    lastBrief=text;
    $("empty-report").hidden=true;
    $("report").hidden=false;
    $("report-indicator").textContent="HEURISTIC REVIEW";
    $("risk-title").textContent="Your working evidence plan";
    const badge=$("risk-badge");
    badge.textContent=data.critical?"CRITICAL FLAG":data.risks.some(r=>r.severity==="medium")?"NEEDS REVIEW":"PRELIMINARY";
    badge.className="pill "+(data.critical?"high":data.risks.some(r=>r.severity==="medium")?"medium":"neutral");
    $("risk-summary").textContent=data.critical
      ?"High-risk phrase detected in the pasted text. Pause and verify intent independently; never transfer secrets or money to apply."
      :data.risks.length
        ?data.risks.length+" phrase-based caution(s). These are not facts about a platform or verification of any payout."
        :"No included risk phrases matched. That's not proof of safety, legitimacy or payment.";
    const ev=$("evidence");ev.replaceChildren();
    if(data.evidence.length===0)ev.append(el("div","question-item","No explicit evidence markers found. Ask for objective deliverables."));
    else for(const item of data.evidence){
      const div=el("div","evidence-item");
      appendText(div,"span","check","☐");
      const b=el("div");
      appendText(b,"strong","",item.label);
      appendText(b,"div","",item.prompt);
      div.append(b);ev.append(div);
    }
    const risks=$("risks");risks.replaceChildren();
    if(data.risks.length===0)risks.append(el("div","question-item","No included phrase patterns detected. Independent due diligence is still needed."));
    else for(const item of data.risks){
      const div=el("div","risk-item "+item.severity);
      appendText(div,"span","severity",item.severity.toUpperCase());
      const b=el("div");
      appendText(b,"strong","",item.title);
      appendText(b,"p","",item.why);
      div.append(b);risks.append(div);
    }
    const q=$("questions");q.replaceChildren();
    if(!data.questions.length)q.append(el("div","question-item","Confirm deadlines, money and accepted artifacts before work."));
    else data.questions.forEach((item,i)=>{
      const row=el("div","question-item");
      appendText(row,"span","",String(i+1).padStart(2,"0"));
      appendText(row,"div","",item);
      q.append(row);
    });
  }catch(err){
    noteEmpty(String(err.message||err));
    $("report-indicator").textContent="INPUT ISSUE";
  }
}
function aiNotes() {
 if(!lastAI)return "";
 return [
   "Model: "+lastAI.model,
   "Potential evidence: "+lastAI.evidence,
   "Question to ask: "+lastAI.unknown,
   "Draft outreach sentence: "+lastAI.opening
 ].join("\n");
}
function downloadPlan(){
 try{
  const text=makeEvidencePlan(brief.value,getInputs(),aiNotes());
  const blob=new Blob([text],{type:"text/markdown;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="taskproof-evidence-plan.md";
  document.body.append(link);
  link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 }catch(err){noteEmpty("Could not export: "+String(err.message||err));}
}
function getWorker(){
 if(!worker){
  worker=new Worker("assets/ai-worker.js",{type:"module",name:"taskproof-open-weight-local-inference"});
  worker.onmessage=({data})=>{
    if(data.type==="status"){
      loading.hidden=false;
      $("ai-idle").hidden=true;
      $("ai-error").hidden=true;
      stage.textContent=data.stage.toUpperCase();
      $("ai-status").textContent=data.message;
      if(Number.isFinite(data.progress))$("loading-fill").style.width=String(data.progress)+"%";
      return;
    }
    if(data.id!==seq)return;
    btnAI.disabled=false;
    loading.hidden=true;
    if(data.type==="result"){
      lastAI=data;
      $("ai-idle").hidden=true;$("ai-error").hidden=true;$("ai-result").hidden=false;
      stage.textContent="ON-DEVICE / DONE";
      $("ai-evidence").textContent=data.evidence||"No reliable summary generated; consult the original brief.";
      $("ai-question").textContent=data.unknown||"Clarify the payment and acceptance criteria.";
      $("ai-opening").textContent=data.opening||"I'd like to confirm the exact deliverables before accepting this task.";
    } else if(data.type==="error"){
      stage.textContent="UNAVAILABLE";
      $("ai-idle").hidden=true;$("ai-result").hidden=true;$("ai-error").hidden=false;
      $("ai-error").textContent="The local model couldn't run: "+data.message+" The free deterministic preflight and calculator still work. Try a modern browser with enough available memory.";
    }
  };
  worker.onerror=(error)=>{
    btnAI.disabled=false;loading.hidden=true;
    $("ai-idle").hidden=true;$("ai-result").hidden=true;$("ai-error").hidden=false;
    $("ai-error").textContent="The browser couldn't start the model worker. Offline checks still work.";
    stage.textContent="WORKER ERROR";
  };
 }
 return worker;
}
function runAI(){
 if(brief.value.trim().length<20){
   $("ai-idle").hidden=true;$("ai-error").hidden=false;
   $("ai-error").textContent="Paste a task description of at least 20 characters to start the model.";
   return;
 }
 try{analyzeBrief(brief.value)}catch(error){$("ai-error").hidden=false;$("ai-error").textContent=error.message;return;}
 renderReport();
 lastAI=null;
 seq++;
 btnAI.disabled=true;
 $("ai-idle").hidden=true;$("ai-result").hidden=true;$("ai-error").hidden=true;
 loading.hidden=false;
 $("loading-fill").style.width="12%";
 stage.textContent="STARTING";
 $("ai-status").textContent="Loading local model…";
 try{getWorker().postMessage({type:"analyze",id:seq,brief:brief.value});}
 catch(err){btnAI.disabled=false;loading.hidden=true;$("ai-error").hidden=false;$("ai-error").textContent=err.message;}
}
brief.addEventListener("input",()=>{
 $("char-count").textContent=brief.value.length.toLocaleString()+" / 12,000";
 if(lastBrief!==brief.value){
   lastAnalysis=null;
   if(!btnAI.disabled)resetAI();
 }
});
$("example-contest").addEventListener("click",()=>{brief.value=exampleContest;resetAI();renderReport();$("reward").value="500";$("fees").value="7.5";$("hours").value="8";chance.value="15";$("costs").value="0";renderEconomics()});
$("example-client").addEventListener("click",()=>{brief.value=exampleClient;resetAI();renderReport();$("reward").value="120";$("fees").value="0";$("hours").value="4";chance.value="85";$("costs").value="0";renderEconomics()});
$("clear").addEventListener("click",()=>{brief.value="";resetAI();noteEmpty();$("char-count").textContent="0 / 12,000";$("report-indicator").textContent="NOT STARTED";brief.focus()});
$("analyze").addEventListener("click",()=>{renderReport();document.getElementById("report-indicator").focus?.()});
$("run-model").addEventListener("click",runAI);
$("export").addEventListener("click",downloadPlan);
for(const id of formInputs){$(id).addEventListener("input",renderEconomics);$(id).addEventListener("change",renderEconomics);}
renderEconomics();
