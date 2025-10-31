import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb, Loader2, Shield } from "lucide-react";

interface ValidationIssue {
    severity: 'critical' | 'warning' | 'suggestion';
    category: string;
    message: string;
    suggestion?: string;
}

interface ValidationResult {
    isValid: boolean;
    overallScore: number;
    issues: ValidationIssue[];
    suggestions: string[];
    estimatedDifficulty?: string;
}

interface Props {
    validation: ValidationResult | null;
    isValidating: boolean;
    onValidate: () => void;
}

export default function QuestionValidation({ validation, isValidating, onValidate }: Props) {
    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <AlertCircle className="w-4 h-4" />;
            case 'warning': return <AlertTriangle className="w-4 h-4" />;
            case 'suggestion': return <Lightbulb className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'destructive';
            case 'warning': return 'default';
            case 'suggestion': return 'secondary';
            default: return 'default';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Question Quality Check</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onValidate}
                    disabled={isValidating}
                >
                    {isValidating ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Validating...
                        </>
                    ) : (
                        'Validate Question'
                    )}
                </Button>
            </div>

            {validation && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Validation Results</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Quality Score:</span>
                                <span className={`text-lg font-bold ${getScoreColor(validation.overallScore)}`}>
                                    {validation.overallScore}/100
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Overall Status */}
                        {validation.isValid ? (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Question looks good! {validation.issues.length === 0 ? 'No issues found.' : 'Minor suggestions below.'}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="w-4 h-4" />
                                <AlertDescription>
                                    Please address critical issues before proceeding.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Estimated Difficulty */}
                        {validation.estimatedDifficulty && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Estimated Difficulty:</span>
                                <Badge variant="outline" className="capitalize">
                                    {validation.estimatedDifficulty}
                                </Badge>
                            </div>
                        )}

                        {/* Issues */}
                        {validation.issues.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Issues Found:</h4>
                                {validation.issues.map((issue, idx) => (
                                    <Alert key={idx} variant={getSeverityColor(issue.severity) as any}>
                                        <div className="flex gap-2">
                                            {getSeverityIcon(issue.severity)}
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {issue.category}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {issue.severity}
                                                    </Badge>
                                                </div>
                                                <AlertDescription>
                                                    {issue.message}
                                                </AlertDescription>
                                                {issue.suggestion && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        💡 {issue.suggestion}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Alert>
                                ))}
                            </div>
                        )}

                        {/* General Suggestions */}
                        {validation.suggestions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Suggestions:</h4>
                                <ul className="space-y-1">
                                    {validation.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}