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