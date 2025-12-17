'use client';

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createOrFetchUser } from "@/lib/auth/authUtils";
import Head from "next/head";
import Image from "next/image";
import {
  Moon,
  Sun,
  Code2,
  Terminal,
  Cpu,
  Globe,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Refs for GSAP
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const codeBlockRef = useRef(null);

  // Dark mode initialization
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

  // Auth Redirect
  useEffect(() => {
    const redirectByRole = async () => {
      if (session?.user?.email) {
        const user = await createOrFetchUser(
          session.user.email,
          session.user.name || ""
        );
        router.push(`/${user.role}`);
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

  // GSAP Animations
  useGSAP(() => {
    const tl = gsap.timeline();

    // Initial state
    gsap.set(".animate-text", { y: 20, opacity: 0 });
    gsap.set(".animate-card", { y: 30, opacity: 0 });
    gsap.set(".code-line", { width: 0, opacity: 0 });

    // Left Panel Animation sequence
    tl.from(leftPanelRef.current, {
      xPercent: -5,
      opacity: 0,
      duration: 1,
      ease: "power3.out"
    })
      .to(".animate-text", {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.8,
        ease: "back.out(1.7)"
      }, "-=0.5")

      // Code typing effect simulation
      .to(".code-line", {
        width: "100%",
        opacity: 1,
        stagger: 0.15,
        duration: 0.8,
        ease: "power1.inOut"
      }, "-=1")

      // Right Panel Animation
      .from(rightPanelRef.current, {
        xPercent: 5,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      }, "-=1.5")
      .to(".animate-card", {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.5");

    // Floating effect for background elements
    gsap.to(".floating-shape", {
      y: -20,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.5
    });

  }, { scope: containerRef });

  return (
    <>
      <Head>
        <title>SysRank - Login</title>
        <link rel="icon" href="/syslogo.png" />
      </Head>

      <div ref={containerRef} className="h-screen w-full flex bg-background overflow-hidden font-sans">

        {/* Left Side - HackerRank Inspired Hero */}
        <div
          ref={leftPanelRef}
          className="hidden lg:flex lg:w-[55%] relative flex-col justify-center p-8 lg:p-12 xl:p-20 overflow-hidden bg-zinc-950 text-white"
        >
          {/* Abstract Tech Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/40 via-zinc-950 to-zinc-950"></div>
            <div className="absolute bottom-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950"></div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]"></div>

            {/* Floating Shapes */}
            <div className="floating-shape absolute top-20 right-20 w-32 h-32 rounded-full blur-[80px] bg-primary/30"></div>
            <div className="floating-shape absolute bottom-40 left-20 w-64 h-64 rounded-full blur-[100px] bg-blue-500/20"></div>
          </div>

          <div className="relative z-10 space-y-8 max-w-2xl">
            {/* Logo area */}
            <div className="flex items-center gap-3 animate-text">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-white border border-zinc-800 shadow-lg shadow-primary/20">
                {/* <Code2 className="h-7 w-7 text-white" /> */}
                <Image src="/syslogo.png" alt="SysRank" width={50} height={50} className="w-7 h-7 drop-shadow-md" />
              </div>
              <span className="text-2xl font-bold tracking-tight">SysRank</span>
            </div>

            {/* Hero Text */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] animate-text">
                Code your way to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-sky-400">
                  excellence
                </span>
              </h1>
              <p className="text-xl text-zinc-400 leading-relaxed max-w-lg animate-text">
                Solve, Participate, and Grow.
              </p>
            </div>

            {/* Code Snippet Visual */}
            <div
              ref={codeBlockRef}
              className="mt-12 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800/50 backdrop-blur-sm shadow-2xl animate-text group hover:border-primary/30 transition-colors duration-500"
            >
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span className="ml-2 text-xs text-zinc-500 font-mono">solve_challenge.sql</span>
              </div>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex gap-2">
                  <span className="text-zinc-600 select-none">1</span>
                  <div className="code-line h-5 bg-zinc-800/50 rounded w-1/3"></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-600 select-none">2</span>
                  <div className="code-line h-5 bg-primary/20 rounded w-3/4"></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-600 select-none">3</span>
                  <div className="code-line h-5 bg-zinc-800/50 rounded w-1/2"></div>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-600 select-none">4</span>
                  <div className="code-line h-5 bg-zinc-800/50 rounded w-2/3"></div>
                </div>
              </div>
            </div>

            {/* Feature Pills */}
            {/* <div className="flex flex-wrap gap-4 pt-4 animate-text">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span>500+ Challenges</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300">
                <Cpu className="w-4 h-4 text-sky-500" />
                <span>System Design</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300">
                <Globe className="w-4 h-4 text-purple-500" />
                <span>Global Rank</span>
              </div>
            </div> */}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div
          ref={rightPanelRef}
          className="flex-1 flex flex-col items-center justify-center p-6 relative bg-background"
        >
          {/* Theme Toggle */}
          <div className="absolute top-6 right-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full hover:bg-muted"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-zinc-700" />
              )}
            </Button>
          </div>

          <div className="w-full max-w-sm animate-card">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8 space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Code2 className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">SysRank</h1>
            </div>

            <Card className="border-border/50 shadow-xl bg-card">
              <CardHeader className="space-y-1 text-center pb-2">
                <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                <CardDescription>
                  Sign in to continue your progress
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-6 pt-6">
                <div className="grid gap-2">
                  <Button
                    onClick={() => handleSocialSignIn("azure-ad")}
                    disabled={isLoading}
                    variant="outline"
                    className="h-12 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 relative overflow-hidden group transition-all"
                  >
                    <div className="absolute inset-0 w-1 bg-primary/50 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    <svg
                      className="w-5 h-5 mr-3"
                      viewBox="0 0 23 23"
                      fill="none"
                    >
                      <path d="M0 0h10.377v10.377H0z" fill="#f25022" />
                      <path d="M12.623 0H23v10.377H12.623z" fill="#7fba00" />
                      <path d="M0 12.623h10.377V23H0z" fill="#00a4ef" />
                      <path d="M12.623 12.623H23V23H12.623z" fill="#ffb900" />
                    </svg>
                    <span>Continue with Microsoft Outlook</span>
                    {isLoading && (
                      <div className="absolute right-4 animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Secure Access
                    </span>
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Enterprise Grade Security</span>
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 p-6">
                <p className="text-center text-xs text-muted-foreground">
                  By clicking continue, you agree to our{" "}
                  <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>.
                </p>
              </CardFooter>
            </Card>

            <div className="mt-8 text-center animate-card">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <span className="text-foreground font-semibold">Contact Administrator</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}