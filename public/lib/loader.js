class Loader{
    #parts;#cacheBust;#cacheBustLength;
    constructor(parts,cacheBust,cacheBustLength){
        this.#parts=parts||[];
        this.#cacheBust=cacheBust;
        this.#cacheBustLength=cacheBustLength||30;
    }
    async load(){
        var i=0;
        for(part of this.#parts){
            await new Promise(async (resolve,reject)=>{
                if (part.type=="script") {
                    const el=document.createElement("script");
                    if (!part.src) throw new Error("No SRC present on load target.");
                    el.src=this.#prepareURL(part.src);
                    el.type=part.subtype||"text/javascript";
                    if(part.sync){
                        el.onerror=event=>reject(part,event);
                        el.onload=event=>resolve(part,event);
                    } else resolve(part);
                    document.body.appendChild(el);
                } else if (type=="css") {
                    const el=document.createElement("link");
                    el.rel="stylesheet";
                    if (!part.href) throw new Error("No HREF present on load target.");
                    el.href=this.#prepareURL(part.href);
                    if(part.sync){
                        el.onerror=event=>reject(part,event);
                        el.onload=event=>resolve(part,event);
                    } else resolve(part);
                    document.head.appendChild(el);
                } else if (type=="function") {
                    try{
                        if(typeof part.function!="function") throw new Error("No valid function present in target.");
                        if(part.sync){
                            const res=await part.function(i,this.#parts.length);
                            resolve(part,res);
                        } else {
                            const res=part.function(i,this.#parts.length);
                            resolve(part,res);
                        }
                    } catch (error) {
                        reject(part,error);
                    }
                } else throw new Error("Unrecognized loader type '"+this.#parts.type+"'.");
            });
            i++;
        }
    }
    #prepareURL(url){
        url=String(url).trim();
        if(url.startsWith("data:")) return url;
        else if(this.#cacheBust?.trim()){
            const parsed=new URL(url);
            parsed.searchParams.append(this.#cacheBust.trim(),this.#generateCacheBust(this.#cacheBustLength));
            return parsed.toString();
        }
        else return url;
    };
    #generateCacheBust(length=30){
        const a="abcdefghijklmnopqrstuvwxyz";
        const charset=a+a.toUpperCase()+"0123456789";
        return new Array(length).fill(0).map(x=>charset[Math.floor(Math.random()*charset.length)]).join();
    };
}