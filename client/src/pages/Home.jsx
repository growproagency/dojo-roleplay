import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Phone, BarChart3, Brain, Target, ChevronRight, Mic, Star, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Dojo Roleplay</span>
          </div>
          <div>
            {loading ? null : user ? (
              <Button onClick={() => setLocation("/dashboard")} size="sm">
                Go to Dashboard <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
          <Phone className="w-3.5 h-3.5" />
          AI-Powered Sales Training
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Practice Enrollment Calls<br />
          <span className="text-primary">Before the Real Thing</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Call a real phone number and practice appointment-setting conversations with an AI acting as a prospective student or parent. Get instant, detailed feedback after every call.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={handleGetStarted} className="text-base px-8 h-12">
            Start Training <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <Button size="lg" variant="outline" onClick={handleGetStarted} className="text-base px-8 h-12 bg-transparent">
            View Demo Scorecard
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">Three simple steps to sharper enrollment conversations.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              icon: Phone,
              title: "Call the Training Number",
              desc: "Dial the training number from any phone. Tell the AI which scenario you want to practice and your preferred difficulty.",
            },
            {
              step: "02",
              icon: Brain,
              title: "Roleplay with AI",
              desc: "The AI acts as a realistic prospect with natural objections, questions, and responses. Practice your pitch in real time.",
            },
            {
              step: "03",
              icon: BarChart3,
              title: "Review Your Scorecard",
              desc: "Get a detailed breakdown of your performance: rapport, needs discovery, objection handling, and appointment setting.",
            },
          ].map((item) => (
            <div key={item.step} className="relative p-6 rounded-xl border border-border bg-card">
              <div className="text-5xl font-black text-primary/10 absolute top-4 right-6 select-none">{item.step}</div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scenarios */}
      <section className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Training Scenarios</h2>
        <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">Realistic roleplay situations designed for martial arts school admissions.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            {
              icon: Target,
              title: "New Student Inquiry",
              desc: "Practice with an adult prospect who found you online. Handle questions about cost, schedule, and commitment while guiding them toward a trial class.",
              tags: ["Rapport Building", "Objection Handling", "Trial Booking"],
            },
            {
              icon: Star,
              title: "Parent Enrollment",
              desc: "Engage a parent calling about enrolling their child. Address safety concerns, explain the kids' program, and secure a trial appointment.",
              tags: ["Trust Building", "Program Explanation", "Appointment Setting"],
            },
          ].map((s) => (
            <div key={s.title} className="p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.desc}</p>
              <div className="flex flex-wrap gap-2">
                {s.tags.map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring */}
      <section className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Detailed Performance Scoring</h2>
        <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">Every call is analyzed by AI across six key sales dimensions.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            "Warm Greeting & Rapport",
            "Needs Discovery",
            "Value Presentation",
            "Objection Handling",
            "Appointment Setting",
            "Urgency & Next Steps",
          ].map((cat) => (
            <div key={cat} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium">{cat}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 text-center">
        <div className="max-w-2xl mx-auto p-10 rounded-2xl border border-primary/20 bg-primary/5">
          <h2 className="text-3xl font-bold mb-4">Ready to Level Up Your Enrollment Calls?</h2>
          <p className="text-muted-foreground mb-8">Sign in to get your training phone number and start your first practice session today.</p>
          <Button size="lg" onClick={handleGetStarted} className="text-base px-10 h-12">
            Get Started Free <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Mic className="w-3 h-3 text-primary" />
            </div>
            <span>Dojo Roleplay</span>
          </div>
          <span>AI-powered sales training for martial arts schools</span>
        </div>
      </footer>
    </div>
  );
}
