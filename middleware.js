const languagelessPaths=["assets","api","lib"];
function parseAcceptLanguage(header) {
  if (!header || typeof header !== 'string') return [];
  return header
    .split(',')
    .map((entry, index) => {
      const parts = entry.trim().split(';');
      const range = parts[0].trim();
      let q = 1.0;
      for (let i = 1; i < parts.length; i++) {
        const param = parts[i].trim();
        if (param.startsWith('q=')) {
          const parsed = parseFloat(param.slice(2));
          if (!isNaN(parsed)) {
            q = Math.max(0, Math.min(1, parsed));
          }
        }
      }
      const specificity = range === '*' ? 0 : range.split('-').length;
      return { range, q, specificity, index };
    })
    .filter(item => item.range && item.q > 0)
    .sort((a, b) => {
      if (b.q !== a.q) return b.q - a.q;
      if (b.specificity !== a.specificity) return b.specificity - a.specificity;
      return a.index - b.index;
    })
    .map(({ range, q }) => ({ range, q }));
}
export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const langData = await(await fetch("https://schoolivate.vercel.app/assets/lang.config.json")).json();
  const prefixes = langData.languages.map(lang=>lang.code);
  const firstPathPart = url.pathname.split("/").filter(Boolean)[0]||"";
  const secondPathPart = url.pathname.split("/").filter(Boolean)[1]||"";
  var languageUsed = "";
  if (prefixes.includes(firstPathPart)) languageUsed=firstPathPart;
  if (languageUsed&&languagelessPaths.includes(secondPathPart)) {
    url.pathname = pathname.replace(new RegExp("^\\/?"+languageUsed+"\\/?"),"/");
    return Response.redirect(url, 302);
  } else if (languageUsed) return;
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
  matcher: ['/((?!api|assets|lib(?:/|$)).*)']
};