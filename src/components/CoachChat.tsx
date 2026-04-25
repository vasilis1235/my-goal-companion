import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

interface CoachChatProps {
  context: string;
}

const WELCOME: Msg = {
  role: "assistant",
  content:
    "👋 **Καλώς ήρθες στο Fitness Tracker!** Είμαι ο AI προπονητής σου.\n\nΗ εφαρμογή έχει 4 ενότητες:\n- 🏠 **Αρχική** — επισκόπηση βάρους & σύστασης\n- ➕ **Νέα** — καταγραφή πλήρους μέτρησης\n- 📊 **Αναφορά** — αναλυτικά με στόχους & εξαγωγή σε PDF/Word\n- ⏰ **Ιστορικό** — όλες οι μετρήσεις\n\nΠες μου, πώς μπορώ να σε βοηθήσω σήμερα; 💪",
};

export const CoachChat = ({ context }: CoachChatProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          context,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        setMessages((prev) => [...prev, { role: "assistant", content: errData.error || "Σφάλμα. Δοκίμασε ξανά." }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m)));
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Πρόβλημα σύνδεσης. Δοκίμασε ξανά." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-transform hover:scale-110",
          "bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))]"
        )}
        aria-label="AI Coach"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </Button>

      {open && (
        <Card className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md h-[70vh] max-h-[600px] z-50 flex flex-col shadow-2xl border-2 animate-in slide-in-from-bottom-4">
          <div className="p-3 border-b bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] text-primary-foreground rounded-t-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <div>
              <div className="font-semibold text-sm">WeightCoach AI</div>
              <div className="text-xs opacity-90">Πάντα εδώ για σένα</div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
            <div className="space-y-3" ref={scrollRef}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&>*]:my-1 [&_ul]:my-1 [&_p]:my-1">
                      <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[85%] flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Σκέφτομαι...
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Γράψε ένα μήνυμα..."
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};
