import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveTrainingScript } from "@/data/trainingScripts";
import { FileText } from "lucide-react";

export default function TrainingScriptDialog({ open, onOpenChange, scenarioTitle }) {
  const script = scenarioTitle ? resolveTrainingScript(scenarioTitle) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {scenarioTitle || "Training script"}
          </DialogTitle>
          {script && (
            <DialogDescription>{script.title}</DialogDescription>
          )}
        </DialogHeader>
        {script && (
          <ol className="space-y-4 pt-2">
            {script.steps.map((step) => (
              <li key={step.num} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                  {step.num}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
