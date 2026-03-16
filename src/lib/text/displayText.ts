export function addSentenceLineBreaks(text: string) {
  if (!text) return text;
  return text
    .replace(/([.!?。！？])\s*/g, "$1\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function getResponsiveSentenceSizeClass(text: string) {
  const normalizedLength = (text || "").replace(/\s+/g, "").length;
  if (normalizedLength >= 56) return "text-lg md:text-xl lg:text-2xl";
  if (normalizedLength >= 36) return "text-xl md:text-2xl lg:text-3xl";
  return "text-2xl md:text-3xl lg:text-4xl";
}

export function shouldBreakAfterWord(word: string) {
  return /[.!?。！？]$/.test((word || "").trim());
}

