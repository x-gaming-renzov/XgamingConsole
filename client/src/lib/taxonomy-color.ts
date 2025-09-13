export function colorForCategory(cat?: string) {
	switch (cat) {
		case "GAMEPLAY": return "indigo";
		case "TECH": return "teal";
		case "ART_CONTENT": return "pink";
		case "BUG": return "red";
		case "MONETIZATION_ADS": return "purple";
		case "ENGAGEMENT_SENTIMENT": return "blue";
		case "FEATURE_REQUEST": return "amber";
		default: return "slate";
	}
}

export function toneForSeverity(sev: "HIGH" | "MEDIUM" | "LOW") {
	return sev === "HIGH" ? "red" : sev === "MEDIUM" ? "amber" : "green";
}
