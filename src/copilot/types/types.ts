import { Static, TSchema } from "@sinclair/typebox";

type Tool<T extends TSchema = TSchema> = {
  input: T;
  description: string;
  handle: (input: Static<T>) => Promise<unknown>;
}

type DialogMessage = {
  role: 'user' | 'system';
  content: string;
}

export type { Tool, DialogMessage };
