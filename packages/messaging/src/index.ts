import { readEnv } from "@headstrong/core";
import Twilio from "twilio";
import { z } from "zod";

const messagingEnv = readEnv(
  {
    TWILIO_ACCOUNT_SID: z.string().min(1),
    TWILIO_AUTH_TOKEN: z.string().min(1),
    TWILIO_FROM_NUMBER: z.string().min(1),
  },
  process.env,
);

const client = Twilio(
  messagingEnv.TWILIO_ACCOUNT_SID,
  messagingEnv.TWILIO_AUTH_TOKEN,
);

export async function sendParentApprovalSms(to: string, body: string) {
  return client.messages.create({
    to,
    body,
    from: messagingEnv.TWILIO_FROM_NUMBER,
  });
}
