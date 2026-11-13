import { parseAcceptLanguage } from "./server/utils.js";
import { renderURL } from "./server/render.js";
var cachedLangData = null;
var languagelessPaths = ["assets"];
export default async function middleware(request) {
    if ((request.headers.get ? request.headers.get('x-internal-request') : request.headers['x-internal-request']) == "1") return;
    const url = new URL(request.url);
    if (/(index.html|index.htm)\/*$/.test(url.pathname)) {
        url.pathname = url.pathname.replace(/(index.html|index.htm)\/*$/, "");
        return Response.redirect(url, 302);
    }
    const pathname = url.pathname;
    const langData = cachedLangData ||= await (await fetch("https://schoolivate.vercel.app/assets/lang.config.json", { headers: { "x-internal-request": "1" } })).json();
    languagelessPaths = langData.languageless;
    const prefixes = langData.languages.map(lang => lang.code);
    const firstPathPart = url.pathname.split("/").filter(Boolean)[0] || "";
    const secondPathPart = url.pathname.split("/").filter(Boolean)[1] || "";
    var languageUsed = "";
    if (prefixes.includes(firstPathPart)) languageUsed = firstPathPart;
    const cookieHeader = (request.headers.get ? request.headers.get('cookie') : request.headers['cookie']) || "";
    const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
            const [key, ...v] = c.trim().split('=');
            return [key, v.join('=')];
        })
    )
    if (!languageUsed && languagelessPaths.includes(firstPathPart)) return;
    else if (languageUsed && languagelessPaths.includes(secondPathPart)) {
        url.pathname = pathname.replace(new RegExp("^\\/?" + languageUsed + "\\/?"), "/");
        return Response.redirect(url, 302);
    } else if (languageUsed) return await renderURL(url, request, langData, cookies);
    const cookieLang = cookies['schoolivate_lang'];
    if (cookieLang && prefixes.includes(cookieLang)) {
        url.pathname = `/${cookieLang}${pathname.startsWith("/") ? pathname : "/" + pathname}`;
        return Response.redirect(url, 302);
    } else if (cookieLang) {
        url.pathname = `/${langData.default}${pathname.startsWith("/") ? pathname : "/" + pathname}`;
        return Response.redirect(url, 302);
    }
    const acceptLangs = parseAcceptLanguage((request.headers.get('accept-language') || langData.default));
    const targetLang = acceptLangs.filter(lang => prefixes.includes(lang.range) || prefixes.includes(lang.range.split(/-|_/)[0]))[0]?.range || langData.default;
    url.pathname = `/${prefixes.includes(targetLang) ? targetLang : targetLang.split(/-|_/)[0]}${pathname.startsWith("/") ? pathname : "/" + pathname}`;
    return Response.redirect(url, 302);
}
export const config = {
    matcher: ['/:path*'],
    runtime: "nodejs"
};