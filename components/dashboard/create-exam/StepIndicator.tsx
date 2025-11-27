import { CheckCircle, Circle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
    number: number;
    title: string;
    icon: LucideIcon;
    description: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="space-y-8 relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border -z-10" />

            {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const Icon = step.icon;

                return (
                    <div key={step.number} className="flex items-start gap-4 relative bg-background/50 backdrop-blur-sm p-2 rounded-lg transition-all duration-300">
                        <div
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 z-10",
                                isActive && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20",
                                isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                                !isActive && !isCompleted && "bg-background border-muted-foreground/30 text-muted-foreground"
                            )}
                        >
                            {isCompleted ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <Icon className="w-4 h-4" />
                            )}
                        </div>
                        <div className="space-y-1 pt-1">
                            <h3 className={cn(
                                "text-sm font-medium transition-colors duration-300",
                                isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {step.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {step.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
