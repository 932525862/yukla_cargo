const p = (n: number) => String(n).padStart(2, "0");

export const fmtDate = (iso: string | Date) => {
  const d = new Date(iso);
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export const fmtDateTime = (iso: string | Date) => {
  const d = new Date(iso);
  return `${fmtDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** <input type="date"> uchun YYYY-MM-DD */
export const toInputDate = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

export const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};
