import { pipeline, env } from "@huggingface/transformers";

const MODEL_ID = "Xenova/flan-t5-small";
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = new URL("./ort/", self.location.href).href;

let generatorPromise;
function status(stage, message, progress) {
  self.postMessage({type:"status",stage,message,progress});
}
async function getModel() {
  if(!generatorPromise) {
    status("downloading","Preparing open-weight FLAN-T5 Small. First run may download model weights.",null);
    generatorPromise = pipeline("text2text-generation", MODEL_ID, {
      device:"wasm",
      dtype:"q8",
      progress_callback(event) {
        if(event?.status==="progress") {
          const pct = Number(event.progress);
          status("downloading","Downloading "+String(event.file||"model file").split("/").pop().slice(0,80),
            Number.isFinite(pct)?Math.min(100,Math.max(0,pct)):null);
        } else if(event?.status==="ready" || event?.status==="done") {
          status("loading","Preparing local inference…",null);
        }
      }
    });
    try { return await generatorPromise; }
    catch(err){ generatorPromise=null; throw err; }
  }
  return generatorPromise;
}
async function reply(gen,prompt,maxTokens=70) {
  const out=await gen(prompt,{max_new_tokens:maxTokens,do_sample:false,temperature:1});
  return String(out?.[0]?.generated_text||"").replace(/\s+/g," ").trim().slice(0,550);
}
let busy=false;
self.onmessage=async ({data})=>{
 if(data?.type!=="analyze"||busy)return;
 const id=data.id;
 if(typeof data.brief!=="string" || data.brief.length<20 || data.brief.length>12000) {
   self.postMessage({type:"error",id,message:"Brief must be 20–12,000 characters."});return;
 }
 busy=true;
 try {
   const gen=await getModel();
   const excerpt=data.brief.slice(0,1100).replace(/\s+/g," ");
   status("inference","Running inference locally in this browser, without sending your brief to a server.",null);
   const evidence=await reply(gen,
     "Read this job description and give ONE concise sentence naming the proof or deliverable required. Do not invent proof. Description: "+excerpt+" Required evidence:",65);
   status("inference","Generating a question for the buyer…",null);
   const unknown=await reply(gen,
     "Read this paid task description. Ask ONE concise question about unclear payment, eligibility or success criteria. Description: "+excerpt+" Question:",65);
   status("inference","Preparing a bid opening line…",null);
   const opening=await reply(gen,
     "Write a short polite first sentence for a freelancer responding to this request. Do not claim work has already been done. Description: "+excerpt+" Draft:",75);
   self.postMessage({type:"result",id,model:MODEL_ID,evidence,unknown,opening});
 }catch(e){
   self.postMessage({type:"error",id,message:String(e?.message||e).slice(0,340)});
 }finally{busy=false;}
};
