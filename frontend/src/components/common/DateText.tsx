import { formatDateTime } from "@/utils/date";

export function DateText({ value }: { value: string | null | undefined }) {
  return <time dateTime={value ?? undefined}>{formatDateTime(value)}</time>;
}
