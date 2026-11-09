import { parseHTML } from 'linkedom';
export async function renderURL(url, request){
    var realPath=url.pathname.replace(/^\/\w+/,"");
    realPath=(realPath.startsWith("/")?realPath:"/"+realPath)||"/";
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
    if (["HEAD","OPTIONS"].includes(request.method)) return response;
    const data = await response.text();
    //...
}