import type { NotificationCopyKey } from "./notification-copy";

export type CreateForUserBaseInput = {
  userUid: string;
  type: string;
  priority?: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown>;
};

/** Caller supplies final title/body (e.g. one-off or already localized). */
export type CreateForUserWithStringsInput = CreateForUserBaseInput & {
  title: string;
  body: string;
};

/** Preferred production path: localize from templates using the user's app language. */
export type CreateForUserWithCopyInput = CreateForUserBaseInput & {
  copyKey: NotificationCopyKey;
  templateArgs?: Record<string, string>;
};

export type CreateForUserInput =
  | CreateForUserWithStringsInput
  | CreateForUserWithCopyInput;

export function isCreateForUserWithCopy(
  input: CreateForUserInput,
): input is CreateForUserWithCopyInput {
  return "copyKey" in input;
}
