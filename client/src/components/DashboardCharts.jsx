import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Activity, PieChart as PieIcon } from "lucide-react";
import { useMemo } from "react";

const SCENARIO_LABELS = {
  new_student: "New Student",
  parent_enrollment: "Parent Enroll",
  web_lead_callback: "Web Callback",
  sales_enrollment: "Sales Enroll",
  renewal_conference: "Renewal",
  cancellation_save: "Cancellation",
};

function scenarioLabel(slug) {
  return SCENARIO_LABELS[slug] || slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardCharts({ calls }) {
  const hasData = calls && calls.length > 0;

  // Practice time per day (last 14 days)
  const practiceTimeData = useMemo(() => {
    if (!calls) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: formatDate(d),
        minutes: 0,
      });
    }
    const dayMap = new Map(days.map(d => [d.date, d]));
    for (const call of calls) {
      if (!call.durationSeconds) continue;
      const callDate = new Date(call.createdAt).toISOString().slice(0, 10);
      const day = dayMap.get(callDate);
      if (day) {
        day.minutes += call.durationSeconds / 60;
      }
    }
    return days.map(d => ({ ...d, minutes: Math.round(d.minutes * 10) / 10 }));
  }, [calls]);

  // Calls per scenario
  const scenarioData = useMemo(() => {
    if (!calls) return [];
    const counts = new Map();
    for (const call of calls) {
      counts.set(call.scenario, (counts.get(call.scenario) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([scenario, count]) => ({ scenario: scenarioLabel(scenario), count }))
      .sort((a, b) => b.count - a.count);
  }, [calls]);

  // Average score over time (last 10 scored calls)
  const scoreTrendData = useMemo(() => {
    if (!calls) return [];
    return (calls || [])
      .filter(c => c.status === "scored" && typeof c.overallScore === "number")
      .slice(-10)
      .reverse()
      .map((c, i) => ({
        label: `#${i + 1}`,
        date: formatDate(c.createdAt),
        score: Math.round(c.overallScore),
      }))
      .reverse();
  }, [calls]);

  if (!hasData) return null;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Practice time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Practice time (last 14 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={practiceTimeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => [`${v} min`, "Practice"]}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Score trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Score trend (last 10 scored)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-40">
            {scoreTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(v) => [`${v}/100`, "Score"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No scored calls yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenario breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-primary" />
            Calls by scenario
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="scenario" tick={{ fontSize: 10 }} width={85} />
                <Tooltip
                  formatter={(v) => [v, "Calls"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
