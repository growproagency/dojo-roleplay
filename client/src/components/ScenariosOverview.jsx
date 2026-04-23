import { fetchScenarios } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  ChevronDown,
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
  Users,
} from "lucide-react";
import { useState } from "react";

const DIFFICULTIES = [
  { label: "Easy", dot: "bg-green-500", blurb: "Friendly, few objections. Good for warm-up." },
  { label: "Medium", dot: "bg-yellow-500", blurb: "Realistic. Some hesitation and pushback." },
  { label: "Hard", dot: "bg-red-500", blurb: "Skeptical and busy. Lots of objections." },
];

const CONTEXT_META = {
  inbound_call: { label: "Inbound call", Icon: PhoneIncoming },
  outbound_callback: { label: "Outbound call", Icon: PhoneOutgoing },
  in_person: { label: "In person", Icon: Users },
};

// Display-only metadata for built-in scenarios. Kept on the frontend because
// the server-side copy lives inside AI system prompts, not as structured fields.
const BUILT_IN_DETAILS = {
  new_student: {
    contextType: "inbound_call",
    character: "Jordan — adult prospect who found you online",
    topics: ["Cost", "Schedule", "Commitment concerns"],
  },
  parent_enrollment: {
    contextType: "inbound_call",
    character: "Sarah — parent of a 7-year-old",
    topics: ["Safety", "Focus & discipline", "Class schedule"],
  },
  web_lead_callback: {
    contextType: "outbound_callback",
    character: "Alex — submitted a web form, hasn't responded",
    topics: ["Building rapport", "Overcoming skepticism", "Booking the appointment"],
  },
  sales_enrollment: {
    contextType: "in_person",
    character: "Jamie — just finished a trial class",
    topics: ["Uncovering goals", "Presenting benefits", "Pricing options"],
  },
  renewal_conference: {
    contextType: "in_person",
    character: "Pat — parent of Tyler (10 months in)",
    topics: ["Progress check questions", "Highlighting growth", "Renewal offer"],
  },
  cancellation_save: {
    contextType: "inbound_call",
    character: "Morgan — parent calling to cancel Cameron's membership",
    topics: ["Finding the real reason", "Extended Time Guarantee", "Closing the save"],
  },
};

export default function ScenariosOverview() {
  const [open, setOpen] = useState(true);
  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: fetchScenarios,
  });

  return (
    <Card className="bg-card border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Available scenarios
              <span className="text-xs text-muted-foreground font-normal ml-1">
                {scenarios ? `(${scenarios.length})` : ""}
              </span>
            </CardTitle>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              When your call connects, the receptionist will ask which scenario and
              difficulty you'd like. Say the <span className="text-foreground font-medium">scenario title</span>{" "}
              and pick <span className="text-foreground font-medium">Easy</span>,{" "}
              <span className="text-foreground font-medium">Medium</span>, or{" "}
              <span className="text-foreground font-medium">Hard</span>.
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !scenarios || scenarios.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No scenarios available.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {scenarios.map((s) => {
                  const details = BUILT_IN_DETAILS[s.id];
                  const contextType = details?.contextType ?? s.contextType;
                  const character =
                    details?.character
                    ?? (s.characterBlurb?.trim() || s.characterName)
                    ?? null;
                  const topics = details?.topics ?? (Array.isArray(s.topics) ? s.topics : []);
                  const ctx = contextType ? CONTEXT_META[contextType] : null;
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg border border-border bg-secondary/30 space-y-2"
                    >
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      {(ctx || character) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {ctx && (
                            <span className="inline-flex items-center gap-1">
                              <ctx.Icon className="w-3 h-3" />
                              {ctx.label}
                            </span>
                          )}
                          {ctx && character && <span>·</span>}
                          {character && <span>{character}</span>}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.description}
                      </p>
                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {topics.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Difficulty
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {DIFFICULTIES.map((d) => (
                  <div key={d.label} className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${d.dot} mt-1.5 shrink-0`} />
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.blurb}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
