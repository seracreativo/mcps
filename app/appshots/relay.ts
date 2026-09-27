// The mailbox between the MCP and the appshots tab. The MCP drops a command in
// the session's inbox and waits for the reply; the tab long-polls the inbox,
// applies the command and posts the reply back. Everything expires within
// seconds: nothing here outlives the conversation it serves.
//
// The shape of what travels is defined in the editor, in
// previews/src/lib/remote/protocol.ts. This file only carries it.

import { randomUUID } from "node:crypto";
import { commandOptions, createClient } from "redis";

/** How long a tab's poll is held open before it asks again. */
const POLL_SECONDS = 20;
/** How long the MCP waits for the tab. Rendering ten previews takes a few seconds. */
const REPLY_SECONDS = 40;
/** A tab that stopped polling longer ago than this is gone. */
const SEEN_SECONDS = POLL_SECONDS + 15;

/** Same alphabet the editor uses to mint codes: no i, l, o, 0 or 1. */
const SESSION = /^[abcdefghjkmnpqrstuvwxyz2-9]{20}$/;

export const validSession = (id: string) => SESSION.test(id);

export class NotListening extends Error {}
export class NoReply extends Error {}

const key = (session: string, part: string) => `appshots:${session}:${part}`;

let connecting: Promise<ReturnType<typeof createClient>> | null = null;

function redis() {
  connecting ??= (async () => {
    const client = createClient({
      // Vercel's Redis integrations name it either way.
      url: process.env.REDIS_URL ?? process.env.KV_URL,
      // Every waiting tab and every waiting tool call holds one of these for
      // up to 40 s. The default pool has ONE: the second waiter would block
      // behind the first, across sessions.
      isolationPoolOptions: { max: 64 },
    });
    // Without a listener, a dropped connection crashes the function.
    client.on("error", () => {});
    await client.connect();
    return client;
  })().catch((error) => {
    connecting = null;
    throw error;
  });
  return connecting;
}

/** The tab's side: the next command, or null when the poll times out. */
export async function listen(session: string): Promise<string | null> {
  const client = await redis();
  const poll = randomUUID();
  await client
    .multi()
    .set(key(session, "seen"), "1", { EX: SEEN_SECONDS })
    .set(key(session, "poll"), poll, { EX: SEEN_SECONDS })
    .exec();

  // Blocking commands need their own connection, or they stall everyone else's.
  const popped = await client.blPop(commandOptions({ isolated: true }), key(session, "inbox"), POLL_SECONDS);
  if (!popped) return null;

  // A reloaded tab leaves its old poll waiting here for up to 20 s, and Redis
  // hands the command to the oldest waiter — which answers nobody. Vercel does
  // not tell the function its client left, so the tell is a newer poll: if
  // one started, this one is stale and the command goes back to the head of
  // the queue, where the newer poll is already waiting.
  if ((await client.get(key(session, "poll"))) !== poll) {
    await client.lPush(key(session, "inbox"), popped.element);
    return null;
  }
  return popped.element;
}

/** The tab's side: the answer to one command. */
export async function answer(session: string, command: string, body: string) {
  const client = await redis();
  await client.multi().rPush(key(session, `reply:${command}`), body).expire(key(session, `reply:${command}`), REPLY_SECONDS).exec();
}

/**
 * An uploaded screenshot, held only until the tab collects it. The upload
 * route waits for that before answering, so at most a few seconds' worth of
 * images sit in Redis at once.
 */
export async function stash(session: string, file: string, bytes: Buffer) {
  const client = await redis();
  await client.set(key(session, `file:${file}`), bytes, { EX: REPLY_SECONDS });
}

/** Read once: the second request for the same file finds nothing. */
export async function take(session: string, file: string): Promise<Buffer | null> {
  const client = await redis();
  return client.getDel(commandOptions({ returnBuffers: true }), key(session, `file:${file}`));
}

/** Whether a tab has polled recently enough to be there. */
export async function listening(session: string) {
  const client = await redis();
  return (await client.exists(key(session, "seen"))) === 1;
}

/** The MCP's side: hand the tab a command and wait for what it says. */
export async function dispatch(session: string, command: unknown): Promise<unknown> {
  const client = await redis();

  // Checked first so a missing tab is said in words, not after a 40-second wait.
  if (!(await listening(session))) throw new NotListening();

  const id = randomUUID();
  await client
    .multi()
    .rPush(key(session, "inbox"), JSON.stringify({ id, command }))
    .expire(key(session, "inbox"), REPLY_SECONDS)
    .exec();

  const popped = await client.blPop(commandOptions({ isolated: true }), key(session, `reply:${id}`), REPLY_SECONDS);
  if (!popped) throw new NoReply();

  return JSON.parse(popped.element);
}
