import { parseHTML } from 'linkedom';
export async function renderURL(url, request){
    var realPath=url.pathname.replace(/^\/\w+/,"");
    realPath=(realPath.startsWith("/")?realPath:"/"+realPath)||"/";
    const data=await(await fetch("https://schoolivate.vercel.app"+realPath,{method:request.method,headers:{"x-internal-request":"1"}})).text();
}