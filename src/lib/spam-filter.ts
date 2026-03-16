const BLOCKED_WORDS = ["광고", "홍보", "클릭", "카지노", "도박"];

export function containsSpam(input: string) {
  const normalized = input.trim().toLowerCase();
  return BLOCKED_WORDS.some((word) => normalized.includes(word));
}
