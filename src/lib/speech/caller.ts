// Sprachausgabe im Stil eines Callers (englisch, wie im TV).
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export function numberToWords(n: number): string {
  if (n === 0) return "no score";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[h]} hundred${rest ? " and " + numberToWords(rest) : ""}`;
}

export function say(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.95;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en-GB")) ?? window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignorieren */
  }
}
