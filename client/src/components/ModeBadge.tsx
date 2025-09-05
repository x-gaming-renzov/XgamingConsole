import { TagPill } from "@/components/ui/tag";

export function ModeBadge({ mode }: { mode: "Sparrow" | "Shifu" }) {
  const isSparrow = mode === "Sparrow";
  const tooltip = isSparrow
    ? "Sparrow (Bandits): speed over certainty. Adaptive allocation, great for tactical wins."
    : "Shifu (A/B): certainty over speed. Fixed allocation, stakeholder-ready confidence.";

  return (
    <TagPill
      tone={isSparrow ? "purple" : "blue"}
      variant="solid"
      tooltip={tooltip}
      aria-label={`${mode} mode`}
      className="uppercase tracking-wide font-medium"
    >
      {mode}
    </TagPill>
  );
}