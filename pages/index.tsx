import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
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
  Terminal,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Refs for GSAP
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const featuresRef = useRef(null);
  const formRef = useRef(null);

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

  // GSAP Animations
  useGSAP(() => {
    const tl = gsap.timeline();

    // Left Panel Animations
    tl.from(leftPanelRef.current, {
      x: -50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    })
      .from(
        titleRef.current,
        {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "back.out(1.7)",
        },
        "-=0.5"
      )
      .from(
        subtitleRef.current,
        {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
        },
        "-=0.6"
      )
      .from(
        ".feature-item",
        {
          x: -20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.4"
      );

    // Right Panel Animations
    tl.from(
      rightPanelRef.current,
      {
        x: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      },
      "-=1.2"
    ).from(
      formRef.current,
      {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.6"
    );
  }, { scope: containerRef });

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
        <title>SysRank - Login</title>
        <link rel="icon" href="/logo3.png" />
      </Head>

      <div ref={containerRef} className="min-h-screen w-full flex bg-background overflow-hidden">
        {/* Left Side - Branding & Visuals (Hidden on mobile) */}
        <div
          ref={leftPanelRef}
          className="hidden lg:flex lg:w-1/2 relative bg-[#0e141e] text-white overflow-hidden flex-col justify-between p-12"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
          </div>

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-primary/20">
              <Image
                src="/logo3.png"
                alt="SysRank Logo"
                width={24}
                height={24}
              />
            </div>
            <span className="text-xl font-bold tracking-tight">SysRank</span>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-lg space-y-8">
            <div className="space-y-4">
              <h1
                ref={titleRef}
                className="text-5xl font-bold leading-tight tracking-tight"
              >
                For <span className="text-primary">Developers</span>,<br />
                By Developers.
              </h1>
              <p
                ref={subtitleRef}
                className="text-lg text-gray-400 leading-relaxed"
              >
                Join the world's leading tech assessment platform. Practice
                coding, prepare for interviews, and get hired by top companies.
              </p>
            </div>

            {/* Feature List */}
            <div ref={featuresRef} className="space-y-4 pt-4">
              {[
                "Practice with 500+ coding challenges",
                "Compete in global hackathons",
                "Get certified in trending technologies",
              ].map((feature, index) => (
                <div
                  key={index}
                  className="feature-item flex items-center gap-3 text-gray-300"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer/Stats */}
          <div className="relative z-10 pt-8 border-t border-white/10">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold text-white">11M+</p>
                <p className="text-sm text-gray-500">Developers</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <p className="text-2xl font-bold text-white">3K+</p>
                <p className="text-sm text-gray-500">Companies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div
          ref={rightPanelRef}
          className="flex-1 flex flex-col relative"
        >
          {/* Mobile Header / Theme Toggle */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
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

          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div
              ref={formRef}
              className="w-full max-w-[400px] space-y-6"
            >
              {/* Mobile Logo (Visible only on small screens) */}
              <div className="lg:hidden flex flex-col items-center mb-8 space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Image
                    src="/logo3.png"
                    alt="SysRank Logo"
                    width={32}
                    height={32}
                  />
                </div>
                <h1 className="text-2xl font-bold">SysRank</h1>
              </div>

              <div className="text-center lg:text-left space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Welcome back!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials to access your account.
                </p>
              </div>

              {/* <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
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
                  className="w-full h-11 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form> */}

              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div> */}

              <div className="grid gap-2">
                <Button
                  onClick={() => handleSocialSignIn("azure-ad")}
                  disabled={isLoading}
                  variant="outline"
                  className="h-11 w-full"
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
                  Microsoft Outlook
                </Button>

                <Button
                  onClick={() => router.push("/learning")}
                  disabled={isLoading}
                  variant="outline"
                  className="h-11 w-full"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Practice Mode (Guest)
                </Button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground px-6">
                By clicking continue, you agree to our{" "}
                <a
                  href="#"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}