"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  MessageCircle,
  Send,
  Sparkles,
  X,
  RotateCcw,
  Loader2,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { useCaseStore } from "@/lib/case-store";

type AssistantCitation = {
  title: string;
  citation: string;
  url: string;
  excerpt: string;
  source_type: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  citations?: AssistantCitation[];
};

type SavedCaseResponse = {
  meta: {
    case_id: string;
    created_at: string;
    share_url: string;
  };
  input: Record<string, unknown>;
  result: Record<string, unknown>;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseISODate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d : null;
}

function isFuture(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return x.getTime() > today.getTime();
}

function getPageTitle(pathname: string) {
  if (pathname === "/") return "الصفحة الرئيسية";
  if (pathname.includes("/case/estate")) return "صفحة التركة";
  if (pathname.includes("/case/heirs")) return "صفحة الورثة";
  if (pathname.includes("/case/family-tree")) return "صفحة شجرة العائلة";
  if (pathname.includes("/case/review")) return "صفحة المراجعة";
  if (pathname.includes("/case/result")) return "صفحة النتيجة";
  if (pathname.includes("/case/explanation")) return "صفحة الشرح";
  if (pathname.includes("/references")) return "صفحة المرجعية";
  return "هذه الصفحة";
}

function getQuickActions(pathname: string) {
  if (pathname.includes("/case/estate")) {
    return [
      "ما معنى صافي التركة؟",
      "اشرح الفرق بين الدين والوصية",
      "ماذا أفعل بعد هذه الصفحة؟",
    ];
  }

  if (pathname.includes("/case/heirs")) {
    return [
      "ما معنى الحجب؟",
      "ما معنى أصحاب الفروض؟",
      "ماذا أفعل بعد هذه الصفحة؟",
    ];
  }

  if (pathname.includes("/case/family-tree")) {
    return [
      "اشرح لي شجرة العائلة",
      "ما معنى العصبة؟",
      "ماذا أفعل بعد هذه الصفحة؟",
    ];
  }

  if (pathname.includes("/case/review")) {
    return [
      "ما شروط استحقاق الإرث؟",
      "ما معنى موانع الإرث؟",
      "ما صافي التركة؟",
    ];
  }

  if (pathname.includes("/case/result")) {
    return [
      "ما معنى الحجب؟",
      "ما معنى العول أو الرد؟",
      "كم نسبة الزوجة؟",
    ];
  }

  if (pathname.includes("/case/explanation")) {
    return [
      "ما معنى الفرض والتعصيب؟",
      "ما معنى العصبة بالغير؟",
      "كيف أفهم النتيجة بسهولة؟",
    ];
  }

  return [
    "ما معنى التركة؟",
    "ما معنى علم الفرائض؟",
    "ما وظيفة هذا المشروع؟",
  ];
}

function buildFallbackReply(pathname: string) {
  return `أنا الآن معك في ${getPageTitle(
    pathname
  )}. أرسل سؤالك وسأجيبك من النصوص المعتمدة المتاحة.`;
}

function getSourceTypeLabel(sourceType: string) {
  if (sourceType === "official_law") return "مصدر قانوني رسمي";
  if (sourceType === "secondary_reference") return "مرجع شرحي مساعد";
  return "مرجع";
}

export default function MirathiAssistant() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedCase, setSavedCase] = useState<SavedCaseResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text: "مرحبًا، أنا مساعد ميراثي. أجيب من النصوص المعتمدة داخل النظام، ويمكنني أيضًا عرض المرجع الذي بُني عليه الجواب.",
    },
  ]);

  const estate = useCaseStore((s) => s.data.estate);
  const heirs = useCaseStore((s) => s.data.heirs);
  const calculationResult = useCaseStore((s) => s.calculationResult);

  const incompleteCount = useMemo(() => {
    return heirs.filter((heir) => {
      const dob = parseISODate(heir.dob);
      return !heir.name.trim() || !heir.dob || (dob ? isFuture(dob) : false);
    }).length;
  }, [heirs]);

  const netEstate =
    (estate.total || 0) -
    (estate.debts || 0) -
    (estate.will || 0) -
    (estate.funeral || 0);

  const quickActions = useMemo(() => getQuickActions(pathname), [pathname]);
  const caseId = searchParams.get("caseId");
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000";

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    async function loadSavedCase() {
      if (!caseId) {
        setSavedCase(null);
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/cases/${caseId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          setSavedCase(null);
          return;
        }

        const data: SavedCaseResponse = await res.json();
        setSavedCase(data);
      } catch {
        setSavedCase(null);
      }
    }

    loadSavedCase();
  }, [apiBaseUrl, caseId]);

  function resetChat() {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: `مرحبًا، أنا مساعد ميراثي. أنت الآن في ${getPageTitle(
          pathname
        )}. اسألني وسأجيبك من النصوص المعتمدة.`,
      },
    ]);
    setInput("");
  }

  async function sendQuestion(question: string) {
    const clean = question.trim();
    if (!clean || loading) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      text: clean,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: clean,
          page_context: {
            page: pathname,
            section: getPageTitle(pathname),
            language: "ar",
          },
          case_data: {
            deceased_gender:
              (savedCase?.input?.deceased_gender as string | undefined) || null,
            reference_mode:
              (savedCase?.input?.reference_mode as string | undefined) ||
              "uae_law",
            madhhab:
              (savedCase?.input?.madhhab as string | undefined) || "general",
            estate,
            heirs,
            heirs_count: heirs.length,
            incomplete_count: incompleteCount,
            net_estate_preview: netEstate,
            current_page_title: getPageTitle(pathname),
          },
          calculation_result:
            savedCase?.result ??
            calculationResult ??
            {
              estate: {
                gross_estate: estate.total || 0,
                funeral: estate.funeral || 0,
                debts: estate.debts || 0,
                requested_will: estate.will || 0,
                allowed_will: estate.will || 0,
                net_estate: netEstate,
              },
              shares: [],
              blocked: [],
              notes: [],
              adjustment: {
                type: "none",
                applied: false,
                explanation: "",
              },
            },
          conversation_history: messages.slice(-8).map((message) => ({
            role: message.role,
            content: message.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: {
        answer?: string;
        in_scope?: boolean;
        requires_human_review?: boolean;
        scope?: string;
        citations?: AssistantCitation[];
      } = await response.json();

      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        text: data.answer?.trim() || buildFallbackReply(pathname),
        citations: Array.isArray(data.citations) ? data.citations : [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        text: "تعذر الوصول إلى المساعد الآن. تأكد من تشغيل الباكيند ثم حاول مرة أخرى.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-white px-4 py-3 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 print:hidden"
      >
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-emerald-50">
          <img
            src="/assistant-avatar.png"
            alt="مساعد ميراثي"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="text-sm font-black text-emerald-800">م</span>
        </div>

        <div className="text-right">
          <div className="text-sm font-black text-slate-900">مساعد ميراثي</div>
          <div className="text-xs text-slate-500">يرد من النصوص المعتمدة</div>
        </div>

        <MessageCircle className="h-5 w-5 text-emerald-700" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] bg-black/30 print:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-gradient-to-l from-emerald-50 to-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50">
                    <img
                      src="/assistant-avatar.png"
                      alt="مساعد ميراثي"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="text-base font-black text-emerald-800">
                      م
                    </span>
                  </div>

                  <div>
                    <div className="text-lg font-black text-slate-900">
                      مساعد ميراثي
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      شرح وتوجيه داخل {getPageTitle(pathname)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                  <Sparkles className="h-4 w-4" />
                  اقتراحات سريعة
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => sendQuestion(action)}
                      disabled={loading}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={[
                      "max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-7 shadow-sm",
                      message.role === "user"
                        ? "border border-slate-200 bg-white text-slate-800"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-950",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap">{message.text}</div>

                    {message.role === "assistant" &&
                    message.citations &&
                    message.citations.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-white/70 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-800">
                          <BookOpen className="h-4 w-4" />
                          المراجع المستخدمة
                        </div>

                        <div className="space-y-2">
                          {message.citations.map((citation, index) => (
                            <div
                              key={`${message.id}-${index}`}
                              className="rounded-xl border border-slate-200 bg-white p-3"
                            >
                              <div className="text-xs font-black text-slate-900">
                                {citation.title || "مرجع"}
                              </div>

                              {citation.citation ? (
                                <div className="mt-1 text-[11px] text-slate-600">
                                  {citation.citation}
                                </div>
                              ) : null}

                              {citation.excerpt ? (
                                <div className="mt-2 text-[12px] leading-6 text-slate-700">
                                  {citation.excerpt}
                                </div>
                              ) : null}

                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                                  {getSourceTypeLabel(citation.source_type)}
                                </span>

                                {citation.url ? (
                                  <a
                                    href={citation.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                                  >
                                    فتح المرجع
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-end">
                  <div className="inline-flex items-center gap-2 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ البحث في النصوص...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  أجيب من النصوص المعتمدة، وأعرض المرجع المستخدم مع الجواب.
                </div>

                <button
                  type="button"
                  onClick={resetChat}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  مسح
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendQuestion(input);
                    }
                  }}
                  placeholder="اكتب سؤالك هنا..."
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => sendQuestion(input)}
                  disabled={loading || !input.trim()}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}