import { parseHTML } from 'linkedom';
import { I18N, I18NLanguage } from "./i18n.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const routes = require("./renderable_routes.json");
function fillTemplate(template,lang,url,realPath,langData,cookies){
    return template
        .replaceAll("[[[LANG]]]",lang.code)
        .replaceAll("[[[DIR]]]]",lang.rtl?"rtl":"ltr")
        .replaceAll("[[[LANG_AREA]]]",lang.code+"_"+lang.region)
        .replaceAll("[[[CURRENT_URI]]]", escapeHTML(realPath+url.search))
        .replaceAll("[[[ORIGINAL_URI]]]", escapeHTML(realPath+cleanParams(url).search))
        .replaceAll("[[[LINK_REL_ALTERNATE]]]",generateAlternates(langData,lang,url,realPath))
        .replaceAll("[[[META_THEME_COLOR]]]",generateThemes(cookies))
        .replaceAll("[[[THEME]]]",cookies["schoolivate_theme"]||"system")
}
function generateAlternates(langData,lang,url,realPath){
    function once(language, target){
        return `<link rel="alternate" hreflang="${language}" href="${escapeHTML(target)}">`
    }
    var res=[once("x-default","https://schoolivate.vercel.app/"+langData.default+realPath+url.search)];
    for(const pl of langData.languages){
        res.push(once(pl.code,"https://schoolivate.vercel.app/"+pl.code+realPath+url.search));
    }
    return res.join("\n        ");
}
function generateThemes(cookies){
    const theme=cookies["schoolivate_theme"];
    if (theme&&theme!="system") {
        if (theme=="light") {
            return `<meta name="theme-color" content="#ffffff" id="meta-theme-user-light"/>
        <meta name="disabled-theme-color" content="#121212" id="meta-theme-user-dark"/>
        <meta name="disabled-theme-color" content="#ffffff" media="(prefers-color-scheme: light)" id="meta-theme-system-light"/>
        <meta name="disabled-theme-color" content="#121212" media="(prefers-color-scheme: dark)" id="meta-theme-system-dark"/>`;
        } else if (theme=="dark") {
            return `<meta name="disabled-theme-color" content="#ffffff" id="meta-theme-user-light"/>
        <meta name="theme-color" content="#121212" id="meta-theme-user-dark"/>
        <meta name="disabled-theme-color" content="#ffffff" media="(prefers-color-scheme: light)" id="meta-theme-system-light"/>
        <meta name="disabled-theme-color" content="#121212" media="(prefers-color-scheme: dark)" id="meta-theme-system-dark"/>`;
        } 
    } else {
        return `<meta name="disabled-theme-color" content="#ffffff" id="meta-theme-user-light"/>
        <meta name="disabled-theme-color" content="#121212" id="meta-theme-user-dark"/>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" id="meta-theme-system-light"/>
        <meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)" id="meta-theme-system-dark"/>`
    }
}
function escapeHTML(str){
    return str.replace(/[&<>'"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[c]));
}
const ALLOWED_PARAMS = new Set(['sort', 'page', 'id']);
function cleanParams(url) {
    const cloned = new URL(url.toString());
    for (const key of Array.from(cloned.searchParams.keys())) {
        if (!ALLOWED_PARAMS.has(key)) {
            cloned.searchParams.delete(key);
        }
    }
    return cloned;
}
export async function renderURL(url, request, langData, cookies){
    var realPath=url.pathname.replace(/^\/\w+/,"");
    realPath=(realPath.startsWith("/")?realPath:"/"+realPath)||"/";
    realPath=realPath.endsWith("/")?realPath:realPath+"/";
    const langUsed=url.pathname.match(/^\/\w+/)[0].slice(1);
    const headers = new Headers(request.headers);
    headers.set('x-internal-request', '1');
    const fetchOptions = {
      method: request.method,
      headers: headers
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = request.body;
    }
    const response = await fetch("https://schoolivate.vercel.app" + realPath, fetchOptions);
    if (["HEAD","OPTIONS"].includes(request.method)||!routes.public.includes(realPath)) return response;
    const template = await response.text();
    const html = fillTemplate(template,langData.languages.find(lang=>lang.code==langUsed||lang.code+"-"+lang.region==langUsed),url,realPath,langData,cookies);
    const {document} = parseHTML(html);
    const i18n = new I18N(document,{
        getSupport:code=>Boolean(langData.languages.find(lang=>lang.code==code||lang.code+"-"+lang.region==code)),
        getData:async code=>await(await fetch("https://schoolivate.vercel.app"+realPath+langData.languages.find(lang=>lang.code==code||lang.code+"-"+lang.region==code).lang_file,{headers:{"x-internal-request":"1"}})).text(),
        init_params:JSON.parse(document.getElementById("i18n-init-vars").innerText),
    });
    const l = await i18n.getLanguageAsync(langUsed);
    l.use();
    return new Response(document.toString(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=0, must-revalidate'
        }
    });
}