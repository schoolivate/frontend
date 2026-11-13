const [I18N,I18NLanguage,BCP47]=(()=>{
function validate(value,type,label){
    if (typeof value!==type&&(type==="object"?value!==null:true)) throw new TypeError(`Parameter '${label}' must be of type '${type}', found '${typeof value}'.`) 
}
function isPlainObject(obj) {
  if (obj === null || typeof obj !== "object") return false;
  return Object.getPrototypeOf(obj) === Object.prototype;
}
function isPlainArray(arr){
    return Array.isArray(arr)&&Object.getPrototypeOf(arr)===Array.prototype;
}
function isAllStrings(arr){
    return arr.reduce((acc,e)=>acc&&typeof e==="string",true);
}
function isAllObjects(arr){
    return arr.reduce((acc,e)=>acc&&isPlainObject(e),true);
}
function clone(value) { 
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    const result = [];
    for (let i = 0; i < value.length; i++) {
      result[i] = clone(value[i]);
    }
    return result;
  }
  const result = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = clone(value[key]);
    }
  }
  return result;
}
function parseData(input = "", options = {}) {
    const res = Object.create(null);
    const warnings = options.warnings || [];
    const onWarning = options.onWarning || ((w) => warnings.push(w));
    if (options.warnings && !res.warnings) {
        res.warnings = warnings;
    }
    const lines = input.split("\n");
    const titleStack = [];
    let i = 0;
    function unescape(str) {
        let out = "";
        let esc = false;
        for (let j = 0; j < str.length; j++) {
            const c = str[j];
            if (esc) {
                out += c;
                esc = false;
            } else if (c === "\\") {
                esc = true;
            } else {
                out += c;
            }
        }
        return out;
    }
    function stripComments(str) {
        let out = "";
        let esc = false;
        for (let j = 0; j < str.length; j++) {
            const c = str[j];
            if (!esc && c === ";" && str[j + 1] === ";") {
                break;
            }
            if (c === "\\") {
                esc = !esc;
                out += c;
            } else {
                esc = false;
                out += c;
            }
        }
        return out;
    }
    function findUnescapedEqual(str) {
        let esc = false;
        for (let j = 0; j < str.length; j++) {
            const c = str[j];
            if (!esc && c === "=") return j;
            esc = (!esc && c === "\\");
        }
        return -1;
    }
    function findUnescapedPlusPlus(str) {
        let esc = false;
        for (let j = 0; j < str.length - 1; j++) {
            const c = str[j];
            if (!esc && c === "+" && str[j + 1] === "+") return j;
            esc = (!esc && c === "\\");
        }
        return -1;
    }
    const ILLEGAL_KEY_CHARS = /['"|=,]/;
    while (i < lines.length) {
        const lineNum = i + 1;
        let raw = lines[i];
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith(";;")) {
            i++;
            continue;
        }
        if (trimmed.startsWith("<!")) {
            const title = trimmed.slice(2).trim();
            if (!title) {
                onWarning({
                    type: "EMPTY_SECTION",
                    message: `Line ${lineNum}: Empty section header '<!'.`,
                    line: lineNum
                });
            } else {
                titleStack.push(title);
            }
            i++;
            continue;
        }
        if (trimmed.startsWith("!>")) {
            const closing = trimmed.slice(2).trim();
            const idx = titleStack.lastIndexOf(closing);
            if (idx !== -1 && closing) {
                titleStack.length = idx;
            } else {
                onWarning({
                    type: "UNMATCHED_CLOSING_SECTION",
                    message: `Line ${lineNum}: Closing section '!> ${closing}' does not match any active section in stack.`,
                    line: lineNum
                });
            }
            i++;
            continue;
        }
        const eq = findUnescapedEqual(raw);
        if (eq === -1) {
            onWarning({
                type: "MALFORMED_LINE",
                message: `Line ${lineNum}: Line lacks an unescaped '=' separator and is not a comment or section tag. Skipped.`,
                line: lineNum
            });
            i++;
            continue;
        }
        const rawKey = raw.slice(0, eq);
        const key = unescape(rawKey).trim();
        if (!key) {
            onWarning({
                type: "EMPTY_KEY",
                message: `Line ${lineNum}: Key is empty before '='. Skipped.`,
                line: lineNum
            });
            i++;
            continue;
        }
        if (ILLEGAL_KEY_CHARS.test(key)) {
            throw new Error(`Fatal Translation Error at line ${lineNum}: Key "${key}" contains illegal characters ('"|=,).`);
        }
        const rest = raw.slice(eq + 1);
        const mlStart = findUnescapedPlusPlus(rest);
        let value = "";
        if (mlStart !== -1) {
            value = stripComments(rest.slice(mlStart + 2)) + "\n";
            i++;
            let closed = false;
            while (i < lines.length) {
                let l = lines[i];
                if (l.endsWith("\r")) l = l.slice(0, -1);
                const endIdx = findUnescapedPlusPlus(l);
                if (endIdx !== -1) {
                    value += stripComments(l.slice(0, endIdx)) + "\n";
                    closed = true;
                    break;
                }
                value += stripComments(l) + "\n";
                i++;
            }
            if (!closed) {
                throw new Error(`Fatal Translation Error: Unclosed multiline block starting at line ${lineNum}. Missing closing '++'.`);
            }
            i++;
            value = unescape(value).trimEnd();
        } else {
            value = unescape(stripComments(rest)).trim();
            i++;
        }
        const fullKey = titleStack.length ? titleStack.join(".") + "." + key : key;
        if (Object.prototype.hasOwnProperty.call(res, fullKey)) {
            onWarning({
                type: "DUPLICATE_KEY",
                message: `Line ${lineNum}: Duplicate key "${fullKey}" encountered. Overwriting previous value.`,
                line: lineNum,
                key: fullKey
            });
        }
        res[fullKey] = value;
    }
    if (!options.warnings && warnings.length > 0) {
        res.warnings = warnings;
    }
    return res;
}
class BCP47 {
    constructor(){
        Object.preventExtensions(this);
    }
    static #validate(obj){
        validate(obj,"object","obj");
        if (!isPlainObject(obj)) throw new TypeError("Parameter 'obj' must be a plain object.");
        const allowed_keys=["language","script","region","variants","extensions","privateuse","grandfathered"];
        for(var key of Object.keys(obj)){
            if (!allowed_keys.includes(key)) throw new TypeError (`Unrecognised BCP-47 property '${key}'.`);
        }
        validate(obj.language,"string","obj.language");
        validate(obj.script,"string","obj.script");
        validate(obj.region,"string","obj.region");
        if (!(isPlainArray(obj.variants)&&isAllStrings(obj.variants))) throw new TypeError("Parameter 'obj.variants' must be of type string[].");
        if (!(isPlainArray(obj.extensions)&&isAllObjects(obj.extensions))) throw new TypeError("Parameter 'obj.extensions' must be of type object[].");
        for(var ext of Object.values(obj.extensions)){
            for(var key of Object.keys(ext)){
                if (!["singleton","parts"].includes(key)) throw new TypeError (`Unrecognised extension property '${key}'.`);
                else {
                    validate(ext.singleton,"string","obj.extensions[number].singleton");
                    if (!(isPlainArray(ext.parts)&&isAllStrings(ext.parts))) throw new TypeError("Parameter 'obj.extensions[number].parts' must be of type string[].");
                }
            }
        }
        if (!(isPlainArray(obj.privateuse)&&isAllStrings(obj.privateuse))) throw new TypeError("Parameter 'obj.extensions' must be of type string[].");
        validate(obj.grandfathered,"string","obj.grandfathered");
    }
    static GRANDFATHERED = new Set([
        "en-GB-oed", "i-ami", "i-bnn", "i-default", "i-enochian",
        "i-hak", "i-klingon", "i-lux", "i-mingo", "i-navajo",
        "i-pwn", "i-tao", "i-tay", "i-tsu",
        "sgn-BE-FR", "sgn-BE-NL", "sgn-CH-DE"
    ]);
    static normalizeCase(obj) {
        this.#validate(obj);
        const out = clone(obj);
        if (out.language) out.language = out.language.toLowerCase();
        if (out.script) out.script = out.script[0].toUpperCase() + out.script.slice(1).toLowerCase();
        if (out.region) out.region = out.region.toUpperCase();
        out.variants = out.variants.map(v => v.toLowerCase());
        out.extensions = out.extensions.map(ext => ({
            singleton: ext.singleton.toLowerCase(),
            parts: ext.parts.map(p => p.toLowerCase())
        }));
        out.privateuse = out.privateuse.map(p => p.toLowerCase());
        return out;
    }
    static parse(tag) {
        validate(tag,"string","tag");
        tag = tag.trim();
        if (!tag) throw new Error("Empty language tag.");
        if (BCP47.GRANDFATHERED.has(tag)) {
            return BCP47.normalizeCase({
                language: "",
                script: "",
                region: "",
                variants: [],
                extensions: [],
                privateuse: [],
                grandfathered: tag
            });
        }
        const parts = tag.split("-");
        let i = 0;
        const result = {
            language: "",
            script: "",
            region: "",
            variants: [],
            extensions: [],
            privateuse: [],
            grandfathered: ""
        };
        const isAlpha = s => /^[A-Za-z]+$/.test(s);
        const isAlnum = s => /^[A-Za-z0-9]+$/.test(s);
        const isDigit = s => /^[0-9]+$/.test(s);
        function peek() { return parts[i]; }
        function consume() { return parts[i++]; }
        const lang = consume();
        if (
            !(
                isAlpha(lang) &&
                (
                    (lang.length >= 2 && lang.length <= 3) ||
                    lang.length === 4 ||
                    (lang.length >= 5 && lang.length <= 8)
                )
            )
        ) {
            throw new Error("Invalid language subtag '" + lang + "'.");
        }
        result.language = lang;
        if (peek() && peek().length === 4 && isAlpha(peek())) {
            const script = consume();
            if (!/^[A-Za-z]{4}$/.test(script)) {
                throw new Error("Invalid script subtag '" + script + "'.");
            }
            result.script = script;
        }
        if (peek()) {
            const p = peek();
            if (
                (p.length === 2 && isAlpha(p)) ||
                (p.length === 3 && isDigit(p))
            ) {
                result.region = consume();
            }
        }
        while (peek()) {
            const p = peek();
            if (
                (p.length >= 5 && p.length <= 8 && isAlnum(p)) ||
                (p.length === 4 && isDigit(p))
            ) {
                if (result.variants.some(v => v.toLowerCase() === p.toLowerCase())) {
                    throw new Error("Invalid variant: duplicate variant '" + p + "'.");
                }
                result.variants.push(consume());
            } else break;
        }
        if (result.variants.length > 1) {
            const lower = result.variants.map(v => v.toLowerCase());
            for (let k = 1; k < lower.length; k++) {
                if (lower[k] < lower[k - 1]) {
                    throw new Error("Invalid variant ordering: variants must be in case-insensitive ASCII order.");
                }
            }
        }
        const usedSingletons = new Set();
        let prevSingleton = null;
        while (peek()) {
            const s = peek().toLowerCase();
            if (s.length === 1 && isAlnum(s) && s !== "x") {
                const singleton = consume();
                if (usedSingletons.has(singleton.toLowerCase()))
                    throw new Error("Invalid extension: duplicate singleton '" + singleton + "'.");
                if (prevSingleton !== null) {
                    if (singleton.toLowerCase() <= prevSingleton) {
                        throw new Error("Invalid extension: extensions must be ordered by singleton in case-insensitive ASCII order.");
                    }
                }
                prevSingleton = singleton.toLowerCase();
                usedSingletons.add(singleton.toLowerCase());
                const ext = { singleton, parts: [] };
                while (peek() && isAlnum(peek()) && peek().length >= 2 && peek().length <= 8) {
                    ext.parts.push(consume());
                }
                if (ext.parts.length === 0)
                    throw new Error("Invalid extension: missing parts.");
                result.extensions.push(ext);
            } else break;
        }
        if (peek() && peek().toLowerCase() === "x") {
            consume();
            while (peek()) {
                const p = peek();
                if (isAlnum(p) && p.length >= 1 && p.length <= 8) {
                    result.privateuse.push(consume());
                } else {
                    throw new Error("Invalid private-use subtag '" + p + "'.");
                }
            }
        }
        if (i !== parts.length) {
            throw new Error("Invalid trailing subtags: '" + (i > 0 ? "-" : "") + parts.slice(i).join("-") + "'.");
        }
        return BCP47.normalizeCase(result);
    }
    static serialize(obj) {
        this.#validate(obj);
        const parts = [];
        if (obj.language) parts.push(obj.language);
        if (obj.script) parts.push(obj.script);
        if (obj.region) parts.push(obj.region);
        for (const v of obj.variants) parts.push(v);
        for (const ext of obj.extensions) {
            parts.push(ext.singleton);
            parts.push(...ext.parts);
        }
        if (obj.privateuse.length > 0) {
            parts.push("x");
            parts.push(...obj.privateuse);
        }
        return parts.join("-");
    }
    static isValid(tag) {
        try {
            BCP47.parse(tag);
            return true;
        } catch (e){
            return e.message;
        }
    }
}
class I18N{
    #isSupported;#fetchLanguage;#onLabelFailure;#languages;#currentLanguage;#variables;#formatters;
    constructor(options){
        validate(options,"object","options");
        if (!isPlainObject(options)) throw new TypeError("Parameter 'options' must be a plain object.");
        const allowed_keys=["getSupport","getData","onLabelFailure","variables","formatters"];
        for(var key of Object.keys(options)){
            if (!allowed_keys.includes(key)) throw new TypeError (`Unrecognised option '${key}'.`);
        }
        var opts={
            getSupport:code=>false,
            getData:async code=>"",
            onLabelFailure:(code,label,reason)=>{console.warn(`Failed to compute label '${label}' in language '${code}'. Reason: ${reason}`);return code+":"+label},
            ...options
        }
        validate(opts.getSupport,"function","options.getSupport");
        validate(opts.getData,"function","options.getData");
        validate(opts.onLabelFailure,"function","options.onLabelFailure");
        if (opts.variables) validate(opts.variables,"object","options.variables");
        else opts.variables={};
        if (opts.formatters) {
            validate(opts.formatters,"object","options.formatters");
            for(var key of Object.keys(opts.formatters)){
                if (typeof key!=="string") throw new TypeError(`Formatter keys must be strings.`);
                validate(opts.formatters[key],"function",`options.formatters[${key}]`);
            }
        } else opts.formatters={};
        this.#isSupported=opts.getSupport;
        this.#onLabelFailure=opts.onLabelFailure;
        this.#fetchLanguage=(async code=>(await opts.getData(code)));
        this.#languages=[];
        this.#currentLanguage=null;
        this.#variables=opts.variables;
        this.#formatters=opts.formatters;
        Object.preventExtensions(this);
    }
    getLanguage(code){
        var validity=BCP47.isValid(code);
        if (validity!==true) throw new Error("Invalid BCP-47 Language Code: "+validity);
        if (!this.#isSupported(code)) throw new Error(`Language code '${code}' is not supported.`);
        if (!this.#languages.find(l=>l.code===code)) throw new Error(`Cannot get language '${code}' in synchronous mode as it hasn't been fetched at least once yet. Use I18N.getLanguageAsync(code) or I18N.insertLanguage(code,data) instead.`);
        return this.#languages.find(l=>l.code===code);
    }
    async getLanguageAsync(code){
        var validity=BCP47.isValid(code);
        if (validity!==true) throw new Error("Invalid BCP-47 Language Code: "+validity);
        if (!this.#isSupported(code)) throw new Error(`Language code '${code}' is not supported.`);
        if (this.#languages.find(l=>l.code===code)) return this.#languages.find(l=>l.code===code);
        var data=await this.#fetchLanguage(code);
        if (typeof data!=="string") throw new Error(`Data returned for language '${code}' isn't a string.`);
        var res=new I18NLanguage(this,code,data);
        this.#languages.push(res);
        return res;
    }
    insertLanguage(code,data){
        var validity=BCP47.isValid(code);
        if (validity!==true) throw new Error("Invalid BCP-47 Language Code: "+validity);
        validate(data,"string","data");
        if (!this.#isSupported(code)) throw new Error(`Language code '${code}' is not supported.`);
        if (this.#languages.find(l=>l.code===code)) return this.#languages.find(l=>l.code===code);
        var res=new I18NLanguage(this,code,data);
        this.#languages.push(res);
        return res;
    }
    getPreferredLanguages(filter=true){
        validate(filter,"boolean","filter");
        var t=this.#isSupported;
        return (navigator?.languages||[]).filter(filter?c=>t(c):()=>true);
    }
    setCurrentLanguage(lang){
        if (typeof lang==="string") lang=this.#languages.find(l=>l.code===lang);
        if (!(lang instanceof I18NLanguage)) throw new TypeError("Parameter 'lang' must be an instance of I18NLanguage class or a BCP-47 language code string.");
        this.#currentLanguage=lang;
        if (!this.#languages.includes(lang)) this.#languages.push(lang); 
        this.updateAllElements();
        return lang;
    }
    removeLanguage(code){
        var validity=BCP47.isValid(code);
        if (validity!==true) throw new Error("Invalid BCP-47 Language Code: "+validity);
        if (this.#currentLanguage&&code===this.#currentLanguage.code) throw new Error(`Cannot remove the current working language ('${code}').`);
        if (!this.#languages.find(l=>l.code===code)) throw new Error(`Language '${code}' not found.`);
        else this.#languages=this.#languages.filter(l=>l.code!==code);
        return true;
    }
    isUsed(lang){
        if (!(lang instanceof I18NLanguage)) throw new TypeError("Parameter 'lang' must be an instance of I18NLanguage class.");
        return this.#currentLanguage===lang;
    }
    resolve(label){
        validate(label,"string","label");
        if (!this.#currentLanguage) {
            this.#onLabelFailure(null,label,"No language loaded.");
            return label;
        }
        return this.#resolveLabel(label,this.#currentLanguage.getRule(label));
    }
    updateAllElements(){
        if(!this.document) return;
        Array.from(this.document.querySelectorAll("[data-i18n]")).forEach(el=>{
            (el.dataset.i18n||"").split("|").filter(Boolean).forEach(stmt=>{
                const parts=stmt.split("=");
                if(parts.length!=2)return;
                const [target,label]=parts.map(p=>p.trim());
                if (target==="text") el.textContent=this.resolve(label);
                else if (target.startsWith("attr-")) el.setAttribute(target.replace(/^attr-/,""),this.resolve(label));
            });
        });
    }
    #resolveLabel(label, rule){
        var str=rule;
        if (typeof str!=="string") {
            this.#onLabelFailure(this.#currentLanguage.code,label,"data isn't a string.");
            return label;
        }
        let out = "";
        let esc = false;
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (esc) {
                out += c;
                esc = false;
                continue;
            }
            if (c === "\\") {
                esc = true;
                out += c;
                continue;
            }
            if (c === "$" && str[i + 1] === "{") {
                let j = i + 2;
                let depth = 1;
                while (j < str.length) {
                    const cc = str[j];
                    if (cc === "{" && str[j - 1] !== "\\") depth++;
                    else if (cc === "}" && str[j - 1] !== "\\") {
                        depth--;
                        if (depth === 0) break;
                    }
                    j++;
                }
                const expr = str.slice(i + 2, j);
                out += onExpr.call(this,expr);
                i = j;
                continue;
            }
            out += c;
        }
        function onExpr(data){
            var parts=data.split(":").map(p=>p.trim());
            if (parts.length>2||parts.length==0) {
                this.#onLabelFailure(this.#currentLanguage.code,label,"Malformed expression at code '"+label+"' in language '"+this.#currentLanguage.code);
                return `\${${parts.join(":")}}`;
            }
            if (parts.length==1) {
                if (parts[0]=="wbr") return "\u200B";
                if (parts[0]=="shy") return "\u00AD";
            } 
            return parts.length==1?(this.#variables[parts[0]]??"${"+parts[0]+"}"):(this.#formatters[parts[1]]??((v)=>v))(this.#variables[parts[0]]??"${"+parts[0]+"}");
        }
        return out;
    }
    setVariable(name,value){
        this.#variables[name]=String(value);
    }
    createText(stmts){
        const el=this.document.createElement("span");
        el.dataset.i18n=stmts;
        (el.dataset.i18n||"").split("|").filter(Boolean).forEach(stmt=>{
            const parts=stmt.split("=");
            if(parts.length!=2)return;
            const [target,label]=parts.map(p=>p.trim());
            if (target==="text") el.textContent=this.resolve(label);
            else if (target.startsWith("attr-")) el.setAttribute(target.replace(/^attr-/,""),this.resolve(label));
        });
        return el;
    }
}
class I18NLanguage{
    #rawData;#manager;#code;#bcp47;#hasFailed=false;#data;
    constructor(i18n,code,data){
        var validity=BCP47.isValid(code);
        if (validity!==true) throw new Error("Invalid BCP-47 Language Code: "+validity);
        validate(data,"string","data");
        if (!(i18n instanceof I18N)) throw new TypeError("Parameter 'i18n' must be an instance of I18N class.");
        this.#rawData=data;
        this.#data=parseData(data);
        this.#manager=i18n;
        try{
            this.#code=code;
            Object.defineProperty(this,"code",{
                get(){return this.#code}
            });
            this.#bcp47=BCP47.parse(this.code);
        }catch(err){
            this.#hasFailed=true;
            throw new Error("Error while parsing BCP-47 Language Code: "+err.message);
        }finally{
            Object.preventExtensions(this);
        }
    }
    use(){
        if (this.#hasFailed) return false;
        this.#manager.setCurrentLanguage(this);
        return true;
    }
    isUsed(){
        if (this.#hasFailed) return false;
        return this.#manager.isUsed(this);
    }
    getRule(label){
        if (this.#hasFailed) return label;
        return this.#data[label];
    }
}
Object.freeze(I18N);
Object.freeze(BCP47);
Object.freeze(I18NLanguage);
Object.freeze(I18N.prototype);
Object.freeze(BCP47.prototype);
Object.freeze(I18NLanguage.prototype);
return [I18N,I18NLanguage,BCP47];
})();