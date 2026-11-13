export function parseAcceptLanguage(header) {
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
export function isTextMime(mimeType) {
    const baseType = mimeType.split(';')[0].trim().toLowerCase();
    if (baseType.startsWith('text/')) return true;
    const explicitTextApps = new Set([
        'application/json',
        'application/xml',
        'application/javascript',
        'application/ecmascript',
        'application/x-javascript',
        'application/xhtml+xml',
        'application/rss+xml',
        'application/atom+xml'
    ]);
    if (explicitTextApps.has(baseType)) return true;
    if (baseType.endsWith('+json') || baseType.endsWith('+xml')) {
        return true;
    }
    return false;
}
export class InternalCachedFetch {
  constructor(maxSizeMB = 20) {
    this.maxSizeBytes = maxSizeMB * 1024 * 1024;
    this.currentSizeBytes = 0;
    this.cache = new Map();
  }
  #hasInternalHeader(headers) {
    if (!headers) return false;
    if (headers instanceof Headers) {
      return headers.get('x-internal-request') === '1';
    }
    if (typeof headers === 'object') {
      return Object.entries(headers).some(
        ([key, value]) => key.toLowerCase() === 'x-internal-request' && String(value) === '1'
      );
    }
    return false;
  }
  async fetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    const isInternal = this.#hasInternalHeader(headers);
    if (!isInternal || method !== 'GET') {
      return fetch(url, options);
    }
    const urlString = typeof url === 'string' ? url : url.url;
    const cacheKey = `${method}:${urlString}`;
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey);
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, entry);
      return new Response(entry.body, {
        status: entry.status,
        statusText: entry.statusText,
        headers: new Headers(entry.headers)
      });
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      return response;
    }
    const clonedResponse = response.clone();
    const bodyText = await clonedResponse.text();
    const sizeBytes = new Blob([bodyText]).size;
    if (sizeBytes > this.maxSizeBytes) {
      return response;
    }
    while (this.currentSizeBytes + sizeBytes > this.maxSizeBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      const oldestEntry = this.cache.get(oldestKey);
      this.currentSizeBytes -= oldestEntry.size;
      this.cache.delete(oldestKey);
    }
    const responseHeaders = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });
    this.cache.set(cacheKey, {
      body: bodyText,
      size: sizeBytes,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    this.currentSizeBytes += sizeBytes;
    return response;
  }
}