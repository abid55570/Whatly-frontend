"use client";

import { ArrowRight, ChevronDown, ChevronUp, Languages, Loader2, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Toggle } from "@/components/ui/Toggle";
import { LOCALE_META } from "@/i18n/config";
import { apiErrorMessage } from "@/lib/api";
import {
  useAddCustomIntent,
  useBulkConfigureIntents,
  useMyIntents,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { BusinessIntent } from "@/types/api";

// Locales offered for per-intent translations (en is the default reply_text)
const TRANSLATION_LOCALES = ["hi", "hinglish", "bn", "ur", "bho"] as const;

interface IntentDraft {
  intent_key: string;
  title: string;
  enabled: boolean;
  reply_text: string;
  reply_translations: Record<string, string>;
  priority: number;
}

export default function IntentsSetupPage() {
  const router = useRouter();
  const { data: intents, isLoading } = useMyIntents();
  const mutation = useBulkConfigureIntents();
  const addCustom = useAddCustomIntent();

  const [drafts, setDrafts] = useState<Record<string, IntentDraft>>({});

  // Merge intents into drafts (preserve edits; pick up newly-added custom Q&As)
  useEffect(() => {
    if (!intents) return;
    setDrafts((current) => {
      const next = { ...current };
      for (const bi of intents) {
        if (!next[bi.intent_key]) {
          next[bi.intent_key] = {
            intent_key: bi.intent_key,
            title: bi.title ?? bi.name ?? bi.intent_key,
            enabled: bi.enabled,
            reply_text: bi.reply_text,
            reply_translations: bi.reply_translations ?? {},
            priority: bi.priority,
          };
        }
      }
      return next;
    });
  }, [intents]);

  const enabledCount = useMemo(
    () => Object.values(drafts).filter((d) => d.enabled).length,
    [drafts],
  );

  function update(key: string, patch: Partial<IntentDraft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleSave() {
    try {
      await mutation.mutateAsync({
        // Drop any with an empty answer — the API requires non-empty reply_text,
        // and those rows keep their seeded default rather than 422 the whole save.
        intents: Object.values(drafts)
          .filter((d) => d.reply_text.trim().length > 0)
          .map((d) => ({
            intent_key: d.intent_key,
            title: d.title,
            enabled: d.enabled,
            reply_text: d.reply_text,
            reply_translations: d.reply_translations,
            priority: d.priority,
          })),
      });
      toast.success("Auto-replies saved! 🎉");
      router.replace("/onboarding/done");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // Sort by priority (desc) so the most common questions show first
  const ordered = (intents ?? [])
    .slice()
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Your ready-made replies
      </h1>
      <p className="text-slate-600 text-sm mb-2">
        These are the questions your customers ask most — already answered for
        you. <span className="font-medium text-slate-800">Nothing to fill.</span>{" "}
        Keep them as-is, tweak any answer, or turn off what you don&apos;t need.
      </p>
      <div className="text-xs font-medium text-brand-700 bg-brand-50 inline-block px-2.5 py-1 rounded-full mb-5">
        ⚡ {enabledCount} replies on
      </div>

      <div className="space-y-3 mb-6">
        {ordered.map((bi) => (
          <QACard
            key={bi.intent_key}
            intent={bi}
            draft={drafts[bi.intent_key]}
            onChange={(patch) => update(bi.intent_key, patch)}
          />
        ))}
      </div>

      <AddYourOwn
        adding={addCustom.isPending}
        onAdd={async (question, answer) => {
          try {
            await addCustom.mutateAsync({ question, answer });
            toast.success("Added! ✅");
          } catch (err) {
            toast.error(apiErrorMessage(err));
          }
        }}
      />

      <div className="h-24" />
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-md mx-auto">
          <Button onClick={handleSave} loading={mutation.isPending} fullWidth size="lg">
            Looks good — finish
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            You can edit all of this later from Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

function QACard({
  intent,
  draft,
  onChange,
}: {
  intent: BusinessIntent;
  draft: IntentDraft | undefined;
  onChange: (patch: Partial<IntentDraft>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  if (!draft) return null;

  const question = draft.title || intent.name || intent.intent_key;
  const translationCount = Object.values(draft.reply_translations).filter(
    (v) => v.trim().length > 0,
  ).length;

  function updateTranslation(locale: string, value: string) {
    onChange({
      reply_translations: { ...draft!.reply_translations, [locale]: value },
    });
  }

  return (
    <div className={cn("card transition", !draft.enabled && "opacity-60 bg-slate-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* The customer QUESTION — concrete, in the owner's language */}
          <div className="flex items-start gap-1.5">
            <span className="text-slate-400 text-sm mt-0.5">❓</span>
            <h3 className="font-semibold text-slate-900 text-sm leading-snug">
              {question}
            </h3>
          </div>
        </div>
        <Toggle checked={draft.enabled} onChange={(next) => onChange({ enabled: next })} />
      </div>

      {draft.enabled && (
        <div className="mt-2 pl-5">
          {/* The ANSWER */}
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-left w-full text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 transition whitespace-pre-line"
            >
              {draft.reply_text}
              <span className="block text-[11px] text-brand-600 mt-1">Tap to edit</span>
            </button>
          ) : (
            <TextArea
              value={draft.reply_text}
              onChange={(e) => onChange({ reply_text: e.target.value })}
              placeholder="What should the bot reply?"
              rows={3}
              maxLength={4000}
              autoFocus
              onBlur={() => setEditing(false)}
              className="text-sm"
            />
          )}

          <button
            type="button"
            onClick={() => setShowTranslations(!showTranslations)}
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 text-xs font-medium transition active:scale-95",
              showTranslations ? "text-brand-700" : "text-slate-500",
            )}
          >
            <Languages className="h-3.5 w-3.5" />
            {translationCount > 0
              ? `${translationCount} language${translationCount > 1 ? "s" : ""} added`
              : "Add other languages (optional)"}
            {showTranslations ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showTranslations && (
            <div className="mt-2 space-y-2 border-l-2 border-brand-100 pl-2">
              {TRANSLATION_LOCALES.map((locale) => {
                const meta = LOCALE_META[locale];
                const value = draft.reply_translations[locale] ?? "";
                return (
                  <div key={locale}>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                      <span>{meta.emoji}</span>
                      <span>{meta.native}</span>
                      {value.trim() && <span className="text-emerald-600">✓</span>}
                    </label>
                    <TextArea
                      value={value}
                      onChange={(e) => updateTranslation(locale, e.target.value)}
                      placeholder={`Reply in ${meta.native} (blank = fall back)`}
                      rows={2}
                      maxLength={4000}
                      className="text-sm"
                    />
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-500 leading-tight">
                💡 The bot detects the customer&apos;s language and sends the matching
                reply. Blank = uses the default above.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddYourOwn({
  adding,
  onAdd,
}: {
  adding: boolean;
  onAdd: (question: string, answer: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function submit() {
    if (!question.trim() || !answer.trim()) {
      toast.error("Add both a question and an answer");
      return;
    }
    await onAdd(question.trim(), answer.trim());
    setQuestion("");
    setAnswer("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 text-brand-700 font-semibold px-4 py-3 rounded-xl text-sm min-h-[48px] transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" />
        Add your own question
      </button>
    );
  }

  return (
    <div className="card border-brand-200 bg-brand-50/40">
      <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-brand-600" />
        Add your own Q&amp;A
      </div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        Question a customer might ask
      </label>
      <TextArea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder='e.g. "Do you do gift wrapping?"'
        rows={1}
        maxLength={300}
        className="text-sm mb-2"
      />
      <label className="block text-xs font-medium text-slate-600 mb-1">
        Your answer
      </label>
      <TextArea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="What should the bot reply?"
        rows={2}
        maxLength={4000}
        className="text-sm mb-3"
      />
      <div className="flex gap-2">
        <Button onClick={submit} loading={adding} size="sm">
          Add
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 px-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
