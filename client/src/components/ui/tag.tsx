import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Dark-surface tuned tones. We bias toward stronger fills and brighter text.
 */
type Tone =
	| "red" | "amber" | "green" | "blue" | "purple" | "indigo" | "teal" | "slate" | "pink";

type Variant = "solid" | "outline" | "soft";

interface TagPillProps extends React.HTMLAttributes<HTMLSpanElement> {
	tone?: Tone;
	variant?: Variant;
	iconLeft?: React.ReactNode;
	iconRight?: React.ReactNode;
	tooltip?: string;
	as?: "span" | "button" | "div";
	/** Forces stronger borders/fills on the pill */
	contrast?: "auto" | "high";
}

const toneStyles: Record<
	Tone,
	{ solid: string; softBg: string; softBorder: string; outlineBorder: string }
> = {
	red:    { solid: "bg-red-600",    softBg: "bg-red-500/22",    softBorder: "border-red-400/40",    outlineBorder: "border-red-400/70" },
	amber:  { solid: "bg-amber-500",  softBg: "bg-amber-400/22",  softBorder: "border-amber-300/40",  outlineBorder: "border-amber-300/70" },
	green:  { solid: "bg-emerald-600",softBg: "bg-emerald-500/22",softBorder: "border-emerald-400/40",outlineBorder: "border-emerald-400/70" },
	blue:   { solid: "bg-blue-600",   softBg: "bg-blue-500/22",   softBorder: "border-blue-400/40",   outlineBorder: "border-blue-400/70" },
	purple: { solid: "bg-purple-600", softBg: "bg-purple-500/22", softBorder: "border-purple-400/40", outlineBorder: "border-purple-400/70" },
	indigo: { solid: "bg-indigo-600", softBg: "bg-indigo-500/22", softBorder: "border-indigo-400/40", outlineBorder: "border-indigo-400/70" },
	teal:   { solid: "bg-teal-600",   softBg: "bg-teal-500/22",   softBorder: "border-teal-400/40",   outlineBorder: "border-teal-400/70" },
	slate:  { solid: "bg-slate-600",  softBg: "bg-slate-500/22",  softBorder: "border-slate-300/35",  outlineBorder: "border-slate-300/60" },
	pink:   { solid: "bg-pink-600",   softBg: "bg-pink-500/22",   softBorder: "border-pink-400/40",   outlineBorder: "border-pink-400/70" },
};

export function TagPill({
	tone = "slate",
	variant = "soft",
	iconLeft,
	iconRight,
	className,
	tooltip,
	as = "span",
	children,
	contrast = "auto",
	...props
}: TagPillProps) {
	const T = as as any;
	const t = toneStyles[tone];

	// Slightly larger + bolder than before for legibility, with more vertical padding
	const base =
		"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold leading-tight transition-colors";

	// Stronger contrast on dark: solid → white text; soft/outline → visible border + ring
	const solid = cn(t.solid, "text-white border border-white/10 shadow-sm");
	const soft = cn(
		t.softBg,
		t.softBorder,
		"text-white/90 border ring-1 ring-inset ring-white/8 shadow-sm"
	);
	const outline = cn(
		t.outlineBorder,
		"bg-transparent text-white border ring-1 ring-inset ring-white/8 shadow-sm"
	);

	// Respect prefers-contrast and optional prop
	const highContrast =
		contrast === "high" ||
		(typeof window !== "undefined" &&
			window.matchMedia &&
			window.matchMedia("(prefers-contrast: more)").matches);

	const variantClass =
		variant === "solid"
			? solid
			: variant === "outline"
			? outline
			: highContrast
			? // soft becomes more filled in high-contrast
				cn(t.softBg.replace("/22", "/30"), t.softBorder, "text-white border ring-white/12")
			: soft;

	const pill = (
		<T
			className={cn(
				base,
				variantClass,
				"hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/30",
				"aria-pressed:ring-2 aria-pressed:ring-white/30",
				className
			)}
			{...props}
		>
			{iconLeft && <span className="shrink-0">{iconLeft}</span>}
			<span className="truncate tracking-wide uppercase">{children}</span>
			{iconRight && <span className="shrink-0">{iconRight}</span>}
		</T>
	);

	if (!tooltip) return pill;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{pill}</TooltipTrigger>
			<TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
		</Tooltip>
	);
}
