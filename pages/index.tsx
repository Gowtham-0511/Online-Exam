import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createOrFetchUser } from "../lib/authUtils";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  LogOut,
  Mail,
  Shield,
  Zap,
  Globe,
  Moon,
  Sun,
  Loader2,
  ArrowRight,
  BarChart3
} from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Dark mode toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const redirectByRole = async () => {
      if (session?.user?.email) {
        const user = await createOrFetchUser(session.user.email, session.user.name || "");
        router.push(`/dashboard/${user.role}`);
      }
    };

    redirectByRole();
  }, [session, router]);

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Auto login after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error('Login failed after signup');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error('Invalid email or password');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>SysRank - Online Assessment Platform</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5"></div>
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SysRank</h1>
                <p className="text-xs text-muted-foreground">Assessment Platform</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="w-9 h-9 p-0"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
          <div className="w-full max-w-md">
            <Card className="border-border bg-card/80 backdrop-blur-sm">
              {/* Hero Section */}
              <CardHeader className="text-center space-y-6 pb-8">
                <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                  <CheckCircle className="w-8 h-8 text-primary-foreground" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold">
                    Welcome to SysRank
                  </CardTitle>
                  <CardDescription className="text-base">
                    Your gateway to seamless online assessments
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {session ? (
                  <>
                    {/* Authenticated State */}
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-foreground">Welcome back!</p>
                        <div className="flex items-center justify-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {session.user?.email}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <p className="text-sm font-medium">Redirecting to your dashboard...</p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full animate-pulse w-full"></div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => signOut()}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Unauthenticated State */}
                    <div className="text-center space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Ready to get started?</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Choose your preferred sign-in method to access your personalized exam dashboard
                        </p>
                      </div>
                    </div>

                    {/* Sign In Buttons */}
                    {/* <div className="space-y-3">
                      <Button
                        onClick={() => handleSignIn("google")}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full h-12 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 border-border"
                        size="lg"
                      >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Continue with Google'
                        )}
                      </Button>

                      <Button
                        onClick={() => handleSignIn("azure-ad")}
                        disabled={isLoading}
                        className="w-full h-12 bg-primary hover:bg-primary/90"
                        size="lg"
                      >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M0 0h11.377v11.372H0V0zm12.623 0H24v11.372H12.623V0zM0 12.623h11.377V24H0V12.623zm12.623 0H24V24H12.623V12.623z" />
                        </svg>
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Continue with Outlook'
                        )}
                      </Button>
                    </div> */}

                    {/* Sign In Buttons */}
                    <div className="space-y-3">
                      {!showEmailAuth ? (
                        <>
                          {/* Google Sign In */}
                          {/* <Button
                            onClick={() => handleSignIn("google")}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full h-12 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 border-border"
                            size="lg"
                          >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Signing in...
                              </>
                            ) : (
                              'Continue with Google'
                            )}
                          </Button> */}

                          {/* Email Sign In Button */}
                          <Button
                            onClick={() => setShowEmailAuth(true)}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full h-12"
                            size="lg"
                          >
                            <Mail className="w-5 h-5 mr-3" />
                            Continue with Email
                          </Button>

                          {/* Microsoft/Outlook Sign In */}
                          <Button
                            onClick={() => handleSignIn("azure-ad")}
                            disabled={isLoading}
                            className="w-full h-12 bg-primary hover:bg-primary/90"
                            size="lg"
                          >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M0 0h11.377v11.372H0V0zm12.623 0H24v11.372H12.623V0zM0 12.623h11.377V24H0V12.623zm12.623 0H24V24H12.623V12.623z" />
                            </svg>
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Signing in...
                              </>
                            ) : (
                              'Continue with Outlook'
                            )}
                          </Button>


                        </>
                      ) : (
                        <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn} className="space-y-4">
                          {error && (
                            <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg">
                              {error}
                            </div>
                          )}

                          {isSignUp && (
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          )}

                          <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />

                          <input
                            type="password"
                            placeholder="Password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />

                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-primary hover:bg-primary/90"
                            size="lg"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isSignUp ? 'Creating account...' : 'Signing in...'}
                              </>
                            ) : (
                              <>{isSignUp ? 'Create Account' : 'Sign In'}</>
                            )}
                          </Button>

                          <div className="text-center">
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError("");
                              }}
                              className="text-sm"
                            >
                              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowEmailAuth(false);
                              setError("");
                            }}
                            className="w-full"
                          >
                            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                            Back to other options
                          </Button>
                        </form>
                      )}
                    </div>

                    <div className="relative">
                      <Separator />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Badge variant="secondary" className="bg-background px-2">
                          Secure Authentication
                        </Badge>
                      </div>
                    </div>

                    {/* Security Features */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-2">
                        <Shield className="w-6 h-6 mx-auto text-primary" />
                        <p className="text-xs text-muted-foreground font-medium">Secure</p>
                      </div>
                      <div className="space-y-2">
                        <Zap className="w-6 h-6 mx-auto text-primary" />
                        <p className="text-xs text-muted-foreground font-medium">Fast</p>
                      </div>
                      <div className="space-y-2">
                        <Globe className="w-6 h-6 mx-auto text-primary" />
                        <p className="text-xs text-muted-foreground font-medium">Reliable</p>
                      </div>
                    </div>

                    {/* Terms */}
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      By signing in, you agree to our terms of service and privacy policy
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Features Grid - Only show when not authenticated */}
            {!session && (
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="text-center group hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <CheckCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Easy Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Streamlined exam interface for focused testing
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center group hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-semibold mb-2">Secure Platform</h3>
                    <p className="text-sm text-muted-foreground">
                      Enterprise-grade security for your assessments
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center group hover:shadow-lg transition-all duration-300 hover:scale-105 sm:col-span-2 lg:col-span-1">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-secondary/50 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-secondary/70 transition-colors">
                      <Zap className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Real-time Results</h3>
                    <p className="text-sm text-muted-foreground">
                      Instant feedback and comprehensive analytics
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Footer */}
            <footer className="text-center mt-12">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Secure</span>
                <span className="text-sm">•</span>
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Reliable</span>
                <span className="text-sm">•</span>
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Multi-Platform</span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}