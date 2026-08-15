/**
 * Normalize a food name into a lookup key: lowercase, trimmed,
 * punctuation stripped, whitespace collapsed, trailing plural "s"
 * removed from each word (eggs -> egg, tomatoes -> tomatoe is avoided
 * via the "es" rule ordering below).
 */
export function normalizeFoodName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .map(singularize)
    .join(" ");
}

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word; // glass, hummus, debris
  if (/ies$/.test(word)) return word.replace(/ies$/, "y"); // berries -> berry
  if (/(oes|ches|shes|xes|zes|ses)$/.test(word)) return word.replace(/es$/, ""); // tomatoes -> tomato
  if (/s$/.test(word)) return word.replace(/s$/, ""); // eggs -> egg
  return word;
}
