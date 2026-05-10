"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { COPY } from "@/constants/copy";
import { cn } from "@/lib/cn";
import { readSSE } from "@/lib/sse";
import type {
  Criterion,
  JudgeChatMessage,
  JudgeVerdict,
  RepoContext,
} from "@/types";

type StreamEvent =
  | { type: "delta"; delta: string }
  | { type: "error"; message: string }
  | { type: "done" };

interface JudgeChatProps {
  criterion: Criterion;
  verdict: JudgeVerdict | null;
  repoContext: RepoContext | null;
  /** Optional persisted history per criterion. */
  history?: JudgeChatMessage[];
  onHistoryChange?: (messages: JudgeChatMessage[]) => void;
}

export function JudgeChat({
  criterion,
  verdict,
  repoContext,
  history,
  onHistoryChange,
}: JudgeChatProps) {
  const [messages, setMessages] = useState<JudgeChatMessage[]>(history ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset chat when criterion changes.
  useEffect(() => {
    abortRef.current?.abort();
    setMessages(history ?? []);
    setInput("");
    setStreaming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterion.id]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    onHistoryChange?.(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || !verdict || streaming) return;
    setInput("");

    const next: JudgeChatMessage[] = [
      ...messages,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];
    setMessages(next);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/judge-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          criterion,
          verdict,
          repoContext,
          messages: next.slice(0, -1), // exclude the empty assistant placeholder
        }),
      });
      if (!res.body) throw new Error("no stream body");

      let acc = "";
      for await (const evt of readSSE<StreamEvent>(res.body, controller.signal)) {
        if (evt.type === "delta") {
          acc += evt.delta;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        } else if (evt.type === "error") {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: acc || `(error: ${evt.message})`,
            };
            return copy;
          });
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? `(error: ${err.message})` : "(error)",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  const disabled = !verdict || streaming;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]">
          {COPY.judge.chatHeader}
        </span>
        {streaming ? (
          <span className="text-xs text-[var(--color-foreground-muted)]">
            {COPY.judge.chatThinking}
          </span>
        ) : null}
      </div>

      <div
        ref={listRef}
        className="flex max-h-72 min-h-[4rem] flex-col gap-2 overflow-y-auto rounded-xl bg-[var(--color-surface-muted)]/40 px-3 py-2 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {COPY.judge.chatEmpty}
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "self-end bg-[var(--color-foreground)] text-white"
                  : "self-start border border-[var(--color-border)] bg-white text-[var(--color-foreground)]",
              )}
            >
              {m.content || (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={COPY.judge.chatPlaceholder}
          rows={2}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/15 disabled:opacity-50"
        />
        <Button type="submit" size="md" disabled={disabled || !input.trim()}>
          {COPY.judge.chatSend}
        </Button>
      </form>
    </div>
  );
}
