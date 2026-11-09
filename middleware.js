const languagelessPaths=["assets","api","lib"];
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
  const acceptLang = (request.headers.get('accept-language') || langData.default).toLowerCase();
  const targetLang = acceptLang[0]+acceptLang[1];
  url.pathname = `/${targetLang}${pathname.startsWith("/")?pathname:"/"+pathname}`;
  return Response.redirect(url, 302);
}
export const config = {
  matcher: ['/((?!api|assets|lib).*)']
};