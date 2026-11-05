import { TrendDownIcon, TrendUpIcon } from "./icons";
import { formatSignedPercent } from "@/lib/format";

export function Change({
  value,
  suffix,
  size = "md",
}: {
  value: number;
  suffix?: string;
  size?: "sm" | "md";
}) {
  const rising = value >= 0;
  const Icon = rising ? TrendUpIcon : TrendDownIcon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${rising ? "text-up" : "text-down"} ${size === "sm" ? "text-sm" : "text-lg"}`}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
      {formatSignedPercent(value)}
      {suffix && <span className="ml-1 text-sm font-normal text-dust">{suffix}</span>}
    </span>
  );
}
