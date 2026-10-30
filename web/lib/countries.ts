export const COUNTRIES = [
  { name: "O'zbekiston", code: "+998" },
  { name: "Xitoy", code: "+86" },
  { name: "Rossiya / Qozog'iston", code: "+7" },
  { name: "Tojikiston", code: "+992" },
  { name: "Qirg'iziston", code: "+996" },
  { name: "Turkmaniston", code: "+993" },
  { name: "Turkiya", code: "+90" },
  { name: "Janubiy Koreya", code: "+82" },
  { name: "BAA", code: "+971" },
  { name: "AQSh / Kanada", code: "+1" },
];

/** Telefon raqamni kod bilan birlashtiradi (kod ikki marta yozilgan bo'lsa, ortig'ini olib tashlaydi) */
export function composePhone(code: string, input: string): string | null {
  let digits = input.replace(/\D/g, "");
  const cc = code.slice(1);
  if (digits.startsWith(cc) && digits.length > 9) digits = digits.slice(cc.length);
  digits = digits.replace(/^0+/, "");
  return digits.length < 7 ? null : `${code}${digits}`;
}
