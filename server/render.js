import { parseHTML } from 'linkedom';
export async function renderURL(url, request){
    var realPath=url.pathname.replace(/^\/\w+/,"");
    realPath=(realPath.startsWith("/")?realPath:"/"+realPath)||"/";
    
}