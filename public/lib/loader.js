class Loader{
    #parts;#cacheBust;
    constructor(parts=[],cacheBust=false){
        this.#parts=parts||[];
        this.#cacheBust=cacheBust;
    }
    async load(){
        for(part of this.#parts){
            await new Promise((resolve,reject)=>{
                if (part.type=="script") {
                    const el=document.createElement("script");
                    if (!part.src) throw new Error("No SRC present on load target");
                    el.src=part.src;
                    el.type=part.mime||"text/javascript";
                    if (typeof part.onerror=="function") el.onerror=part.onerror;
                    if (typeof part.onload=="function"&&!part.sync) el.onload=part.onload;
                    else if (typeof part.onload=="function"&&part.sync) el.onload=async(event)=>{};
                });
            } 
        }
    }
}