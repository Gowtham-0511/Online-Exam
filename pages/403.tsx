import { Shield, Home, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Forbidden() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-8">
                {/* Main Error Card */}
                <Card className="border-2 shadow-lg">
                    <CardHeader className="text-center space-y-4 pb-4">
                        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shield className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-4xl font-bold tracking-tight">
                                403
                            </CardTitle>
                            <CardDescription className="text-xl font-medium text-foreground/90">
                                Access Denied
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Alert Box */}
                        <Alert className="bg-destructive/10 border-destructive/50">
                            <Lock className="h-4 w-4 text-destructive" />
                            <AlertDescription className="text-foreground/80">
                                Your IP address is not authorized to access this resource.
                            </AlertDescription>
                        </Alert>

                        {/* Information Section */}
                        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                            <h3 className="font-semibold text-lg text-foreground">
                                Why am I seeing this?
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>Your IP address may be blocked by our security policies</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>You may not have the required permissions to view this page</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>Access to this resource is restricted to authorized users only</span>
                                </li>
                            </ul>
                        </div>

                        {/* Action Hints */}
                        <div className="border-l-4 border-primary pl-4 py-2">
                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">Need access?</span> Please contact your system administrator or support team to request authorization.
                            </p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                        <Button
                            variant="default"
                            className="w-full sm:w-auto"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => window.location.href = '/'}
                        >
                            <Home className="mr-2 h-4 w-4" />
                            Return Home
                        </Button>
                    </CardFooter>
                </Card>

                {/* Footer Info */}
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Error Code: <span className="font-mono text-foreground">403_FORBIDDEN</span>
                    </p>
                </div>
            </div>
        </div>
    );
}