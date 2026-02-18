export type AnomalyType = "EARLY" | "LATE" | "NO_CHECKOUT" | "DUPLICATE";

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  EARLY: "이른출근",
  LATE: "늦은출근",
  NO_CHECKOUT: "미퇴근",
  DUPLICATE: "중복",
};

export const ANOMALY_COLORS: Record<AnomalyType, string> = {
  EARLY: "bg-blue-100 text-blue-800",
  LATE: "bg-orange-100 text-orange-800",
  NO_CHECKOUT: "bg-yellow-100 text-yellow-800",
  DUPLICATE: "bg-red-100 text-red-800",
};

export const getKSTHour = (dateStr: string): number => {
  const d = new Date(dateStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours();
};

export const formatDateForInput = (date: Date) => {
  return date.toISOString().split("T")[0];
};

export const formatTime = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "-";
  }
};
