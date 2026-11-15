class Loader{
    #urls;#promises;
    constructor(parts=[]){
        this.#urls=parts||[];
        this.#promises=[];
    }
    start(){
        
    }
    #createScript(url, options){
        const el=document.createElement(options.type?"":"");
    }
}