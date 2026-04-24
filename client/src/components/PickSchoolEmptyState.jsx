import { Card, CardContent } from "@/components/ui/card";
import { School } from "lucide-react";

export default function PickSchoolEmptyState({ message }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="flex flex-col items-center text-center py-16 gap-3">
        <School className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm font-medium">
          {message ?? "Pick a school to continue."}
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Use the school switcher in the sidebar to select a school, or switch to a
          platform-wide view from the Leaderboard or All Schools pages.
        </p>
      </CardContent>
    </Card>
  );
}
