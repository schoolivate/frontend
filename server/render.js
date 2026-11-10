import { parseHTML } from 'linkedom';
import { I18n, I18NLanguage } from "i18n.js";
import routes from "renderable_routes.json" assert {type:"json"};
function fillTemplate(template){
    return template
        .replace("[[")
}
export async function renderURL(url, request, langData){
    var realPath=url.pathname.replace(/^\/\w+/,"");
    realPath=(realPath.startsWith("/")?realPath:"/"+realPath)||"/";
    realPath=realPath.endsWith("/")?realPath:realPath+"/";
    const langUsed=utl.pathname.match(/^\/\w+/)[0].slice(1);
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
    const html = fillTemplate(template,langData.languages.find(lang=>lang.code==langUsed||lang.code+"-"+lang.region==langUsed));
    const {document} = parseHTML(html);
    const i18n = new I18n(document,{
        getSupport:code=>Boolean(langData.languages.find(lang=>lang.code==code||lang.code+"-"+lang.region==code)),
        getData:async code=>await(await fetch("https://schoolivate.vercel.app"+realPath+langData.languages.find(lang=>lang.code==code||lang.code+"-"+lang.region==code).lang_file,{headers:{"x-internal-request":"1"}})).text(),
        init_params:JSON.parse(document.getElementById("i18n-init-vars").innerText),
    });
}