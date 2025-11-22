import React from 'react';
import { useSession } from "next-auth/react";
import UnifiedDashboardLayout from '@/components/layouts/UnifiedDashboardLayout';
import Head from 'next/head';
import {
    MapPin,
    Briefcase,
    GraduationCap,
    Github,
    Linkedin,
    Globe,
    Trophy,
    Star,
    Zap,
    Award,
    CheckCircle2,
    Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const ProfilePage = () => {
    const { data: session } = useSession();

    // Mock Data - Replace with actual API calls later
    const userStats = {
        rank: 14203,
        points: 850,
        badges: { gold: 1, silver: 3, bronze: 5 },
        solved: 42,
        streak: 7
    };

    const skills = [
        { name: "JavaScript", progress: 85 },
        { name: "React", progress: 70 },
        { name: "Python", progress: 60 },
        { name: "SQL", progress: 45 }
    ];

    const badges = [
        { name: "Problem Solving", level: "Gold", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
        { name: "React Developer", level: "Silver", icon: Award, color: "text-slate-400", bg: "bg-slate-400/10" },
        { name: "SQL Basic", level: "Bronze", icon: Star, color: "text-orange-700", bg: "bg-orange-700/10" },
        { name: "Python Basic", level: "Silver", icon: Award, color: "text-slate-400", bg: "bg-slate-400/10" },
    ];

    const certificates = [
        { name: "Frontend Developer (React)", date: "Oct 2023", id: "AB123456" },
        { name: "JavaScript (Basic)", date: "Sep 2023", id: "CD789012" }
    ];

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>Profile | SysRank</title>
            </Head>

            <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in-up">

                {/* Header / Cover (Optional, keeping it clean for now) */}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Sidebar - Profile Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20" />
                            <CardContent className="pt-0 relative px-6 pb-6">
                                <div className="absolute -top-16 left-6">
                                    <div className="w-32 h-32 rounded-full border-4 border-background bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground shadow-md">
                                        {session?.user?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <div className="mt-20 space-y-4">
                                    <div>
                                        <h1 className="text-2xl font-bold">{session?.user?.name}</h1>
                                        <p className="text-muted-foreground">@{session?.user?.email?.split('@')[0]}</p>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        Aspiring Full Stack Developer | Passionate about building scalable web applications.
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="gap-1">
                                            <MapPin className="w-3 h-3" /> India
                                        </Badge>
                                        <Badge variant="secondary" className="gap-1">
                                            <Briefcase className="w-3 h-3" /> Student
                                        </Badge>
                                    </div>

                                    <div className="pt-4 border-t border-border/50 space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                            <Github className="w-4 h-4" />
                                            <span>github.com/{session?.user?.name?.split(' ')[0].toLowerCase()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                            <Linkedin className="w-4 h-4" />
                                            <span>linkedin.com/in/{session?.user?.name?.split(' ')[0].toLowerCase()}</span>
                                        </div>
                                    </div>

                                    <Button className="w-full">Edit Profile</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Skills Card */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Skills</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {skills.map(skill => (
                                    <div key={skill.name} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{skill.name}</span>
                                            <span className="text-muted-foreground">{skill.progress}%</span>
                                        </div>
                                        <Progress value={skill.progress} className="h-2" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Stats Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="border-border/50 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-primary/10 rounded-full mb-2 text-primary">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold">{userStats.rank}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-medium">Global Rank</div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-amber-500/10 rounded-full mb-2 text-amber-500">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold">{userStats.points}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-medium">Points</div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-emerald-500/10 rounded-full mb-2 text-emerald-500">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold">{userStats.solved}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-medium">Problems Solved</div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 shadow-sm">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-purple-500/10 rounded-full mb-2 text-purple-500">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="text-2xl font-bold">{userStats.streak}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-medium">Day Streak</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Badges */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-primary" />
                                    Badges
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {badges.map((badge, index) => (
                                        <div key={index} className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className={`p-3 rounded-full ${badge.bg} ${badge.color}`}>
                                                <badge.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{badge.name}</div>
                                                <div className="text-xs text-muted-foreground">{badge.level} Level</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-border bg-muted/10 text-muted-foreground text-sm hover:bg-muted/20 cursor-pointer transition-colors">
                                        + View All Badges
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Certifications */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                    Certifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {certificates.map((cert, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <Award className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">{cert.name}</div>
                                                <div className="text-sm text-muted-foreground">Issued {cert.date}</div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">View</Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Recent Activity (Heatmap Placeholder) */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    Submission History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-32 flex items-end gap-1 w-full overflow-hidden">
                                    {Array.from({ length: 50 }).map((_, i) => {
                                        const height = Math.floor(Math.random() * 100);
                                        const opacity = Math.max(0.2, height / 100);
                                        return (
                                            <div
                                                key={i}
                                                className="flex-1 bg-primary rounded-t-sm hover:opacity-80 transition-opacity"
                                                style={{
                                                    height: `${height}%`,
                                                    opacity: opacity
                                                }}
                                                title={`Day ${i + 1}: ${height} submissions`}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                    <span>3 months ago</span>
                                    <span>Today</span>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </UnifiedDashboardLayout>
    );
};

export default ProfilePage;
