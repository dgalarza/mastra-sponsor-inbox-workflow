import { devflowSponsorEmail } from "./fixtures/sponsor-email";
import { inboxTriageWorkflow } from "./mastra/workflows/inbox-triage.workflow";

const run = await inboxTriageWorkflow.createRun();
const result = await run.start({
  inputData: {
    rawEmail: devflowSponsorEmail,
    mailbox: "youtube@damian.example",
  },
  initialState: {
    normalizedEmail: null,
    classification: null,
    sponsorDetails: null,
    externalCorroboration: null,
  },
});

console.log(JSON.stringify(result, null, 2));
