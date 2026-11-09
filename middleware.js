export function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Skip static assets, API routes, and already-prefixed paths
  if (
    pathname.startsWith('/en') || 
    pathname.startsWith('/ar') || 
    pathname.startsWith('/assets') || 
    pathname.startsWith('/api') ||
    pathname.includes('.') // skips files like favicon.ico, manifest.json
  ) {
    return; // Pass through untouched
  }

  // 2. Check if the user has a saved language preference cookie
  const cookieLang = request.cookies.get('schoolivate_lang')?.value;
  if (cookieLang === 'ar' || cookieLang === 'en') {
    url.pathname = `/${cookieLang}${pathname}`;
    return Response.redirect(url, 302);
  }

  // 3. Fallback: Sniff browser Accept-Language header for first-time visitors
  const acceptLang = request.headers.get('accept-language') || '';
  const isArabic = acceptLang.toLowerCase().includes('ar');
  const targetLang = isArabic ? 'ar' : 'en';

  url.pathname = `/${targetLang}${pathname}`;
  return Response.redirect(url, 302);
}

// Config to control which routes trigger the middleware
export const config = {
  matcher: ['/((?!api|assets|lib).*)'],
};
