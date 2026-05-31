import type { GuardrailDecision, SponsorDetails } from "./schemas";

export function draftSponsorReply(details: SponsorDetails, decision: GuardrailDecision): string {
  const senderName = details.sender.name?.split(" ")[0] ?? "there";

  return `Hi ${senderName},

Thanks for reaching out. DevFlow AI sounds relevant to the kinds of production AI workflow topics my audience cares about.

Before I can recommend a fit or quote anything specific, could you send a bit more detail?

- Budget range for this campaign
- Deliverable scope, including whether you are considering a dedicated video, an integrated mention, or both
- Campaign timeline and any launch dates
- Demo access or walkthrough materials
- Customer proof, case studies, or public examples I can review
- Security/compliance materials, especially if the product touches code, specs, tickets, or GitHub workflows

Once I have that, I can come back with availability and the right sponsorship options. I am not committing to a placement yet; I just want to make sure the product, proof, and campaign shape are a strong fit first.

Best,
Damian`;
}
