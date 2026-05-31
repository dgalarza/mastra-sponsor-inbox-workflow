import type { EmailClassification, InboxCategory } from "./schemas";

export const LOW_CONFIDENCE_THRESHOLD = 0.75;
export const NORMAL_ROUTE_THRESHOLD = 0.85;

export function routeClassification(category: InboxCategory, confidence: number): EmailClassification["routing"] {
  if (confidence < LOW_CONFIDENCE_THRESHOLD || category === "unknown") {
    return {
      action: "review_required",
      warning: `Confidence ${confidence.toFixed(2)} is below ${LOW_CONFIDENCE_THRESHOLD}; human review required.`,
    };
  }

  if (category === "sponsor_inquiry") {
    return {
      action: "route_sponsor",
      warning:
        confidence < NORMAL_ROUTE_THRESHOLD
          ? `Sponsor route allowed, but confidence ${confidence.toFixed(2)} is in the warning band.`
          : null,
    };
  }

  if (category === "automated_noise") {
    return { action: "ignore", warning: null };
  }

  return {
    action: "review_required",
    warning: `Category ${category} is outside this demo's sponsor automation lane.`,
  };
}
