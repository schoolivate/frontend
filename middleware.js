import {parseAcceptLanguage} from "server/utils.js";
import {renderURL} from "server/render.js";
const langData = await(await fetch("https://schoolivate.vercel.app/assets/lang.config.json")).json();
const languagelessPaths=langData.languageless;
export default async function middleware(request) {
  if ((request.headers.get ? request.headers.get('x-internal-request') : request.headers['x-internal-request'])=="1") return;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const prefixes = langData.languages.map(lang=>lang.code);
  const firstPathPart = url.pathname.split("/").filter(Boolean)[0]||"";
  const secondPathPart = url.pathname.split("/").filter(Boolean)[1]||"";
  var languageUsed = "";
  if (prefixes.includes(firstPathPart)) languageUsed=firstPathPart;
  if (!languageUsed&&languagelessPaths.includes(secondPathPart)) return; 
  else if (languageUsed&&languagelessPaths.includes(secondPathPart)) {
    url.pathname = pathname.replace(new RegExp("^\\/?"+languageUsed+"\\/?"),"/");
    return Response.redirect(url, 302);
  } else if (languageUsed) return await renderURL(url,request,langData);
  const cookieHeader = (request.headers.get ? request.headers.get('cookie') : request.headers['cookie']) || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...v] = c.trim().split('=');
      return [key, v.join('=')];
    })
  );
  const cookieLang = cookies['schoolivate_lang'];
  if (prefixes.includes(cookieLang)) {
    url.pathname = `/${cookieLang}${pathname.startsWith("/")?pathname:"/"+pathname}`;
    return Response.redirect(url, 302);
  } else if (cookieLang) {
    url.pathname = `/${langData.default}${pathname.startsWith("/")?pathname:"/"+pathname}`;
    return Response.redirect(url, 302);
  }
  const acceptLangs = parseAcceptLanguage((request.headers.get('accept-language') || langData.default));
  const targetLang = acceptLangs.filter(lang=>prefixes.includes(lang.range)||prefixes.includes(lang.range.split(/-|_/)[0]))[0].range;
  url.pathname = `/${prefixes.includes(targetLang)?targetLang:targetLang.split(/-|_/)[0]}${pathname.startsWith("/")?pathname:"/"+pathname}`;
  return Response.redirect(url, 302);
}
export const config = {
  matcher: ['/((?!('+languagelessPaths.join("|")+')(?:/|$)).*)']
};