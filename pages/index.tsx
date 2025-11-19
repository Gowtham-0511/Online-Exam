import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createOrFetchUser } from "../lib/authUtils";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Moon,
  Sun,
  Code2,
  Terminal,
  Trophy,
  Users,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Dark mode toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Redirect on authentication
  useEffect(() => {
    const redirectByRole = async () => {
      if (session?.user?.email) {
        const user = await createOrFetchUser(
          session.user.email,
          session.user.name || ""
        );
        router.push(`/dashboard/${user.role}`);
      }
    };

    redirectByRole();
  }, [session, router]);

  const handleSocialSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      // Auto login after signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Login failed after signup");
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
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid email or password");
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
        <link rel="icon" href="/logo3.png" />
      </Head>

      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Image
                    src="/logo3.png"
                    alt="logo"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    SysRank
                  </h1>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center overflow-y-auto">
          <div className="container mx-auto px-4 lg:px-8 py-4">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center max-w-7xl mx-auto">
              {/* Left Side - Hero Section */}
              <div className="space-y-6">
                {/* Main Heading */}
                <div className="space-y-3">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5 text-primary mr-1.5" />
                    <span className="text-xs font-medium text-primary">
                      Join developers
                    </span>
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                    Practice coding.
                    <br />
                    <span className="text-primary">Ace interviews.</span>
                  </h1>
                  <p className="text-base text-muted-foreground max-w-md">
                    Master your coding skills with real-world challenges.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div className="group p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                      <Terminal className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-0.5 text-sm">
                      500+ Challenges
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      From easy to expert level problems
                    </p>
                  </div>

                  <div className="group p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-0.5 text-sm">
                      Live Contests
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Compete with developers worldwide
                    </p>
                  </div>

                  <div className="group p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                      <Code2 className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-0.5 text-sm">
                      20+ Languages
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Code in your favorite language
                    </p>
                  </div>

                  <div className="group p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-0.5 text-sm">
                      Global Community
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Learn and grow with peers
                    </p>
                  </div>
                </div>

                {/* Stats */}
                {/* <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <div>
                    <div className="text-xl font-bold text-foreground">2M+</div>
                    <div className="text-xs text-muted-foreground">
                      Problems Solved
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">50K+</div>
                    <div className="text-xs text-muted-foreground">
                      Active Users
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">4.9★</div>
                    <div className="text-xs text-muted-foreground">
                      User Rating
                    </div>
                  </div>
                </div> */}
              </div>

              {/* Right Side - Auth Form */}
              <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
                <div className="bg-card border border-border rounded-2xl shadow-lg p-5 lg:p-6">
                  {/* Form Header */}
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      {activeTab === "signin"
                        ? "Welcome back"
                        : "Create your account"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === "signin"
                        ? "Sign in to continue your journey"
                        : "Start practicing coding challenges"}
                    </p>
                  </div>

                  {/* Social Sign In */}
                  <div className="space-y-2.5 mb-4">
                    {/* <Button
                      onClick={() => handleSocialSignIn("google")}
                      disabled={isLoading}
                      className="w-full h-10 bg-background hover:bg-muted border border-border text-foreground font-medium"
                      variant="outline"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button> */}

                    <Button
                      onClick={() => handleSocialSignIn("azure-ad")}
                      disabled={isLoading}
                      className="w-full h-10 bg-background hover:bg-muted border border-border text-foreground font-medium"
                      variant="outline"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        viewBox="0 0 23 23"
                        fill="none"
                      >
                        <path d="M0 0h10.377v10.377H0z" fill="#f25022" />
                        <path d="M12.623 0H23v10.377H12.623z" fill="#7fba00" />
                        <path d="M0 12.623h10.377V23H0z" fill="#00a4ef" />
                        <path d="M12.623 12.623H23V23H12.623z" fill="#ffb900" />
                      </svg>
                      Continue with Outlook
                    </Button>

                    <Button
                      onClick={() => router.push("/learning")}
                      disabled={isLoading}
                      className="w-full h-10 bg-muted hover:bg-muted/80 border border-border text-foreground font-medium"
                      variant="outline"
                    >
                      <Terminal className="w-5 h-5 mr-2" />
                      Practice Mode (Guest)
                    </Button>
                  </div>

                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex rounded-lg bg-muted p-1 mb-4">
                    <button
                      onClick={() => {
                        setActiveTab("signin");
                        setError("");
                      }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "signin"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("signup");
                        setError("");
                      }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "signup"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start">
                      <span className="flex-1">{error}</span>
                    </div>
                  )}

                  {/* Sign In Form */}
                  {activeTab === "signin" && (
                    <form onSubmit={handleEmailSignIn} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 h-10 bg-background border-border focus-visible:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="password"
                            className="text-sm font-medium"
                          >
                            Password
                          </Label>
                          {/* <a
                            href="#"
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot password?
                          </a> */}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="pl-10 pr-10 h-10 bg-background border-border focus-visible:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Sign Up Form */}
                  {activeTab === "signup" && (
                    <form onSubmit={handleEmailSignUp} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Full name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="pl-10 h-10 bg-background border-border focus-visible:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-email"
                          className="text-sm font-medium"
                        >
                          Email address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 h-10 bg-background border-border focus-visible:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-password"
                          className="text-sm font-medium"
                        >
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="pl-10 pr-10 h-10 bg-background border-border focus-visible:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Footer */}
                  <div className="mt-4 space-y-3">
                    <div className="text-center text-xs text-muted-foreground">
                      By continuing, you agree to our{" "}
                      <a href="#" className="text-primary hover:underline">
                        Terms
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-xs">
                        Protected by 256-bit encryption
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}