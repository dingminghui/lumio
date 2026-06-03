import dayjs from "dayjs";

export function formatDateTime(date: Date | string | number) {
  return dayjs(date).format("YYYY年M月D日 HH:mm");
}
