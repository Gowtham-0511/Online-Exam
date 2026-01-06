"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createOrFetchUser } from "@/lib/auth/authUtils";
import Head from "next/head";
import Image from "next/image";
import {
  Moon,
  Sun,
  ShieldCheck,
  Code2,
  Cpu,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import anime from "animejs";

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

// Import the 3D Scene
import ThreeScene from "@/components/landing/ThreeScene";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Refs for GSAP
  const containerRef = useRef(null);
  const heroTextRef = useRef(null);
  const loginCardRef = useRef(null);
  const logoRef = useRef(null);
  const decorativeLineRef = useRef(null);

  // Dark mode init
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Default to what the user had or system preference
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
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
        try {
          const user = await createOrFetchUser(
            session.user.email,
            session.user.name || ""
          );
          router.push(`/${user.role}`);
        } catch (e) {
          console.error("Auth redirect error", e);
        }
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
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Initial setup
    gsap.set(heroTextRef.current, { x: -30, opacity: 0 });
    gsap.set(loginCardRef.current, { y: 30, opacity: 0 });
    gsap.set(logoRef.current, { y: -20, opacity: 0 });

    // Sequence
    tl.to(logoRef.current, { y: 0, opacity: 1, duration: 0.8 })
      .to(heroTextRef.current, { x: 0, opacity: 1, duration: 1 }, "-=0.6")
      .to(loginCardRef.current, { y: 0, opacity: 1, duration: 1 }, "-=0.8");

    // Decorative Line Animation
    if (decorativeLineRef.current) {
      gsap.fromTo(decorativeLineRef.current,
        { width: 0, opacity: 0 },
        { width: 96, opacity: 1, duration: 1.5, ease: "power2.out", delay: 0.5 }
      );
    }
  }, { scope: containerRef });

  return (
    <>
      <Head>
        <title>SysRank - Login</title>
        <link rel="icon" href="/syslogo.png" />
      </Head>

      <div
        ref={containerRef}
        className="relative min-h-screen w-full flex bg-background/95 transition-colors duration-500 overflow-hidden font-sans"
      >

        {/* Top Header Area */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
          {/* Logo - Visible here on Mobile, hidden on desktop if part of Hero */}
          <div className="lg:hidden">
            <span className="font-bold text-xl">SysRank</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">Need Help?</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full bg-background/50 border border-border/50 hover:bg-muted/50 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-zinc-700" />
              )}
            </Button>
          </div>
        </div>

        {/* 3D Background Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 dark:opacity-60">
          <ThreeScene />
        </div>

        {/* Main Content Container - Split Layout */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row h-screen items-center px-6 lg:px-12 pt-20 lg:pt-0">

          {/* Left Side: Hero Text */}
          <div className="flex-1 flex flex-col justify-center items-start w-full max-w-2xl lg:pr-12 mb-12 lg:mb-0">
            <div ref={logoRef} className="hidden lg:flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-md bg-transparent dark:bg-white/95 flex items-center justify-center transition-colors">
                <Image src="/syslogo.png" alt="SysRank" width={32} height={32} className="w-8 h-8 object-contain" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">SysRank</span>
            </div>

            <div ref={heroTextRef} className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                Code your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A4EF] to-[#0078D4] dark:from-[#00F0FF] dark:to-[#00A4EF]">
                  way to
                </span> <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0078D4] to-[#2B5C95] dark:from-[#00A4EF] dark:to-[#00F0FF]">
                  excellence
                </span>
              </h1>

              {/* Decorative Line under text */}
              <div className="h-1 bg-gradient-to-r from-[#00A4EF] to-transparent rounded-full" ref={decorativeLineRef}></div>

              <p className="text-xl text-muted-foreground font-medium max-w-lg">
                Solve, Participate, and Grow.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-background/40 backdrop-blur-md border border-border/50 rounded-full text-sm font-medium shadow-sm">
                  <Code2 className="w-4 h-4 text-[#00A4EF]" />
                  <span>Coding Challenges</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-background/40 backdrop-blur-md border border-border/50 rounded-full text-sm font-medium shadow-sm">
                  <Cpu className="w-4 h-4 text-purple-500" />
                  <span>System Design</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Login Card */}
          <div className="flex-1 flex items-center justify-center lg:justify-end w-full">
            <div ref={loginCardRef} className="w-full max-w-md">
              <Card className="border-0 shadow-2xl bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl">
                <CardHeader className="text-center space-y-2 pb-6 pt-8">
                  <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Sign in to continue your progress
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pb-8">
                  <Button
                    onClick={() => handleSocialSignIn("azure-ad")}
                    disabled={isLoading}
                    className="w-full h-14 text-base font-semibold bg-[#002D56] hover:bg-[#002D56]/90 text-white relative overflow-hidden transition-all shadow-md group dark:border dark:border-white/10"
                  >
                    <div className="flex items-center justify-center gap-3">
                      {/* Microsoft Logo constructed with divs for perfect vector crispness */}
                      <div className="grid grid-cols-2 gap-0.5 mr-1">
                        <div className="w-2 h-2 bg-[#f25022]" />
                        <div className="w-2 h-2 bg-[#7fba00]" />
                        <div className="w-2 h-2 bg-[#00a4ef]" />
                        <div className="w-2 h-2 bg-[#ffb900]" />
                      </div>
                      <span>Continue with Microsoft Outlook</span>
                    </div>
                    {isLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></div>
                      </div>
                    )}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-[#0f172a] px-2 text-muted-foreground font-semibold tracking-wider">
                        Secure Access
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full text-sm font-medium">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Enterprise Grade Security</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 text-center text-xs text-muted-foreground pt-6 pb-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t">
                  <p>
                    By clicking continue, you agree to our{" "}
                    <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>.
                  </p>
                  <div className="w-full pt-2">
                    <p>
                      Don&apos;t have an account?{" "}
                      <span className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors">
                        Contact Administrator
                      </span>
                    </p>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}