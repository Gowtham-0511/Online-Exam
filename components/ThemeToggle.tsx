"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const isLight = resolvedTheme === "light";
    const isDark = resolvedTheme === "dark";

    return (
        <TooltipProvider delayDuration={150}>
            <DropdownMenu>
                <Tooltip>
                    <DropdownMenuTrigger asChild>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Theme: ${resolvedTheme ?? "system"}`}
                                className="relative group rounded-full transition-colors hover:bg-accent"
                            >
                                {/* Sun (light) */}
                                <Sun
                                    className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${isLight ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                                        }`}
                                />
                                {/* Moon (dark) */}
                                <Moon
                                    className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
                                        }`}
                                />
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </TooltipTrigger>
                    </DropdownMenuTrigger>
                    <TooltipContent sideOffset={8}>Theme: {resolvedTheme ?? "system"}</TooltipContent>
                </Tooltip>

                <DropdownMenuContent align="end" sideOffset={8} className="w-40">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setTheme("light")}
                        className="flex items-center gap-2"
                    >
                        <Sun className="h-4 w-4" />
                        Light
                        {resolvedTheme === "light" && (
                            <span className="ml-auto inline-block h-2 w-2 rounded-full bg-primary" />
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setTheme("dark")}
                        className="flex items-center gap-2"
                    >
                        <Moon className="h-4 w-4" />
                        Dark
                        {resolvedTheme === "dark" && (
                            <span className="ml-auto inline-block h-2 w-2 rounded-full bg-primary" />
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setTheme("system")}
                        className="flex items-center gap-2"
                    >
                        <Laptop className="h-4 w-4" />
                        System
                        {theme === "system" && (
                            <span className="ml-auto inline-block h-2 w-2 rounded-full bg-primary" />
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </TooltipProvider>
    );
}
