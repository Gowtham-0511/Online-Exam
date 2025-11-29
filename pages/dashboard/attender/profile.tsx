import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
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
    Calendar,
    ExternalLink,
    Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';

interface Certificate {
    id: string;
    exam_title: string;
    score: number;
    issue_date: string;
}

interface UserProfile {
    bio: string;
    location: string;
    occupation: string;
    github_url: string;
    linkedin_url: string;
    website_url: string;
    profile_image?: string;
}

const ProfilePage = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoadingCerts, setIsLoadingCerts] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [profile, setProfile] = useState<UserProfile>({
        bio: "",
        location: "",
        occupation: "",
        github_url: "",
        linkedin_url: "",
        website_url: "",
        profile_image: ""
    });

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            const response = await fetch('/api/certificate/my-certificates');
            if (response.ok) {
                const data = await response.json();
                setCertificates(data.certificates);
            }
        } catch (error) {
            console.error("Failed to fetch certificates:", error);
        } finally {
            setIsLoadingCerts(false);
        }
    };

    const [userStats, setUserStats] = useState({
        rank: 0,
        points: 0,
        badges: { gold: 0, silver: 0, bronze: 0 },
        solved: 0,
        streak: 0
    });
    const [skills, setSkills] = useState<{ name: string; progress: number }[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [submissionHistory, setSubmissionHistory] = useState<string[]>([]);

    useEffect(() => {
        if (session?.user?.email) {
            fetchUserStats();
            fetchUserProfile();
        }
    }, [session?.user?.email]);

    const fetchUserStats = async () => {
        try {
            const response = await fetch(`/api/attender/stats?email=${session?.user?.email}`);
            if (response.ok) {
                const data = await response.json();
                setUserStats({
                    rank: data.rank,
                    points: data.points,
                    badges: data.badges,
                    solved: data.solved,
                    streak: data.streak
                });
                setSkills(data.skills);
                setSubmissionHistory(data.submissionHistory);
            }
        } catch (error) {
            console.error("Failed to fetch user stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`/api/attender/profile?email=${session?.user?.email}`);
            if (response.ok) {
                const data = await response.json();
                if (data.profile) {
                    setProfile({
                        bio: data.profile.bio || "",
                        location: data.profile.location || "",
                        occupation: data.profile.occupation || "",
                        github_url: data.profile.github_url || "",
                        linkedin_url: data.profile.linkedin_url || "",
                        website_url: data.profile.website_url || "",
                        profile_image: data.profile.profile_image || ""
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/attender/profile?email=${session?.user?.email}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                toast.success("Profile updated successfully!");
                setIsEditing(false);
            } else {
                toast.error("Failed to update profile.");
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("An error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    // Derived badges from stats (Optional: You can enhance this logic)
    const badges = [
        { name: "Problem Solving", level: "Gold", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10", earned: userStats.badges.gold > 0 },
        { name: "Consistent Learner", level: "Silver", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10", earned: userStats.streak > 5 },
        { name: "Skill Master", level: "Bronze", icon: Star, color: "text-orange-700", bg: "bg-orange-700/10", earned: userStats.points > 500 },
        { name: "Certificated", level: "Silver", icon: Award, color: "text-slate-400", bg: "bg-slate-400/10", earned: certificates.length > 0 },
    ].filter(b => b.earned);

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
                                    <div className="w-32 h-32 rounded-full border-4 border-background bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground shadow-md overflow-hidden">
                                        {profile.profile_image ? (
                                            <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            session?.user?.name?.charAt(0) || 'U'
                                        )}
                                    </div>
                                </div>
                                <div className="mt-20 space-y-4">
                                    <div>
                                        <h1 className="text-2xl font-bold">{session?.user?.name}</h1>
                                        <p className="text-muted-foreground">@{session?.user?.email?.split('@')[0]}</p>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        {profile.bio || "Aspiring Full Stack Developer | Passionate about building scalable web applications."}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {profile.location && (
                                            <Badge variant="secondary" className="gap-1">
                                                <MapPin className="w-3 h-3" /> {profile.location}
                                            </Badge>
                                        )}
                                        {profile.occupation && (
                                            <Badge variant="secondary" className="gap-1">
                                                <Briefcase className="w-3 h-3" /> {profile.occupation}
                                            </Badge>
                                        )}
                                        {!profile.location && !profile.occupation && (
                                            <span className="text-xs text-muted-foreground italic">Add details to your profile</span>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-border/50 space-y-3">
                                        {profile.github_url && (
                                            <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                                <Github className="w-4 h-4" />
                                                <span className="truncate">{profile.github_url.replace(/^https?:\/\//, '')}</span>
                                            </a>
                                        )}
                                        {profile.linkedin_url && (
                                            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                                <Linkedin className="w-4 h-4" />
                                                <span className="truncate">{profile.linkedin_url.replace(/^https?:\/\//, '')}</span>
                                            </a>
                                        )}
                                        {profile.website_url && (
                                            <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                                <Globe className="w-4 h-4" />
                                                <span className="truncate">{profile.website_url.replace(/^https?:\/\//, '')}</span>
                                            </a>
                                        )}
                                        {!profile.github_url && !profile.linkedin_url && !profile.website_url && (
                                            <div className="text-xs text-muted-foreground italic">No social links added</div>
                                        )}
                                    </div>

                                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full gap-2">
                                                <Edit2 className="w-4 h-4" /> Edit Profile
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Edit Profile</DialogTitle>
                                                <DialogDescription>
                                                    Make changes to your profile here. Click save when you're done.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="flex flex-col items-center gap-4 mb-4">
                                                    <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-md relative group">
                                                        {profile.profile_image ? (
                                                            <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-3xl font-bold text-muted-foreground">
                                                                {session?.user?.name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                        <label htmlFor="image-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                            <Edit2 className="w-6 h-6 text-white" />
                                                        </label>
                                                        <input
                                                            id="image-upload"
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    if (file.size > 1024 * 1024) { // 1MB limit
                                                                        toast.error("Image size must be less than 1MB");
                                                                        return;
                                                                    }
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        setProfile({ ...profile, profile_image: reader.result as string });
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">Click to change photo (Max 1MB)</span>
                                                </div>

                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="occupation" className="text-right">
                                                        Occupation
                                                    </Label>
                                                    <Input
                                                        id="occupation"
                                                        value={profile.occupation}
                                                        onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                                                        className="col-span-3"
                                                        placeholder="e.g. Student, Developer"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="location" className="text-right">
                                                        Location
                                                    </Label>
                                                    <Input
                                                        id="location"
                                                        value={profile.location}
                                                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                        className="col-span-3"
                                                        placeholder="e.g. New York, USA"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="bio" className="text-right">
                                                        Bio
                                                    </Label>
                                                    <Textarea
                                                        id="bio"
                                                        value={profile.bio}
                                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                        className="col-span-3"
                                                        placeholder="Tell us about yourself"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="github" className="text-right">
                                                        GitHub
                                                    </Label>
                                                    <Input
                                                        id="github"
                                                        value={profile.github_url}
                                                        onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                                                        className="col-span-3"
                                                        placeholder="https://github.com/username"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="linkedin" className="text-right">
                                                        LinkedIn
                                                    </Label>
                                                    <Input
                                                        id="linkedin"
                                                        value={profile.linkedin_url}
                                                        onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                                                        className="col-span-3"
                                                        placeholder="https://linkedin.com/in/username"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="website" className="text-right">
                                                        Website
                                                    </Label>
                                                    <Input
                                                        id="website"
                                                        value={profile.website_url}
                                                        onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                                                        className="col-span-3"
                                                        placeholder="https://yourwebsite.com"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" onClick={handleSaveProfile} disabled={isSaving}>
                                                    {isSaving ? "Saving..." : "Save changes"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Skills Card */}
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Skills</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingStats ? (
                                    <div className="space-y-4 animate-pulse">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="space-y-2">
                                                <div className="h-4 bg-muted rounded w-full"></div>
                                                <div className="h-2 bg-muted rounded w-3/4"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : skills.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-4">
                                        No skills data available yet.
                                    </div>
                                ) : (
                                    skills.map(skill => (
                                        <div key={skill.name} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{skill.name}</span>
                                                <span className="text-muted-foreground">{skill.progress}%</span>
                                            </div>
                                            <Progress value={skill.progress} className="h-2" />
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Stats Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {isLoadingStats ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Card key={i} className="border-border/50 shadow-sm animate-pulse">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                            <div className="w-10 h-10 bg-muted rounded-full mb-2"></div>
                                            <div className="w-12 h-8 bg-muted rounded mb-1"></div>
                                            <div className="w-20 h-3 bg-muted rounded"></div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <>
                                    <Card className="border-border/50 shadow-sm">
                                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                            <div className="p-2 bg-primary/10 rounded-full mb-2 text-primary">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div className="text-2xl font-bold">{userStats.rank > 0 ? `#${userStats.rank}` : '-'}</div>
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
                                </>
                            )}
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
                                {isLoadingCerts ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Loading certificates...
                                    </div>
                                ) : certificates.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No certificates earned yet. Complete certificate exams to earn them!
                                    </div>
                                ) : (
                                    certificates.map((cert) => (
                                        <div key={cert.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <Award className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{cert.exam_title}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <span>Issued {new Date(cert.issue_date).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className="text-primary font-medium">Score: {cert.score}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/attender/certificate/${cert.id}`)}
                                                className="gap-2"
                                            >
                                                View
                                                <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))
                                )}
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
                                    {Array.from({ length: 90 }).map((_, i) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - (89 - i));
                                        const dateString = date.toISOString().split('T')[0];
                                        const count = submissionHistory.filter(d => d === dateString).length;

                                        // Normalize height for visualization (max 5 submissions per day for full height)
                                        const height = Math.min(100, Math.max(10, count * 20));
                                        const opacity = count > 0 ? Math.min(1, 0.4 + (count * 0.1)) : 0.1;

                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-t-sm transition-all ${count > 0 ? 'bg-primary' : 'bg-muted'}`}
                                                style={{
                                                    height: `${count > 0 ? height : 10}%`,
                                                    opacity: opacity
                                                }}
                                                title={`${dateString}: ${count} submissions`}
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
