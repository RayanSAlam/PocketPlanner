export const money = (n: number) =>
  `${n < 0 ? "-" : "+"}${Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD" })}`;

export const moneyAbs = (n: number) =>
  Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const formatDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const formatMonthYear = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const todayIso = () => new Date().toLocaleDateString("en-CA");
