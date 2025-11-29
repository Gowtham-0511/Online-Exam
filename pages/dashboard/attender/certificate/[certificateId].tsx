import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import UnifiedDashboardLayout from "@/components/layouts/UnifiedDashboardLayout";
import { Button } from "@/components/ui/button";
import { Download, Share2, Award, CheckCircle, ExternalLink } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface CertificateData {
    id: string;
    user_name: string;
    exam_title: string;
    issue_date: string;
    score: number;
}

export default function CertificateView() {
    const router = useRouter();
    const { certificateId } = router.query;
    const { data: session } = useSession();
    const [certificate, setCertificate] = useState<CertificateData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const certificateRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!certificateId) return;

        const fetchCertificate = async () => {
            try {
                const response = await fetch(`/api/certificate/view?id=${certificateId}`);
                if (response.ok) {
                    const data = await response.json();
                    setCertificate(data.certificate);
                } else {
                    toast.error("Certificate not found");
                }
            } catch (error) {
                console.error("Error fetching certificate:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCertificate();
    }, [certificateId]);

    useGSAP(() => {
        if (certificate && containerRef.current) {
            const tl = gsap.timeline();

            tl.from(containerRef.current, {
                y: 50,
                opacity: 0,
                duration: 0.8,
                ease: "power3.out"
            })
                .from(".cert-element", {
                    y: 20,
                    opacity: 0,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: "power2.out"
                }, "-=0.4")
                .from(".cert-watermark", {
                    scale: 0.8,
                    opacity: 0,
                    duration: 1,
                    ease: "elastic.out(1, 0.5)"
                }, "-=0.8");
        }
    }, [certificate]);

    const handleDownload = async () => {
        if (!certificateRef.current || !certificate) return;

        try {
            const loadingToast = toast.loading("Generating PDF...");

            const dataUrl = await toPng(certificateRef.current, {
                quality: 1,
                pixelRatio: 2,
                cacheBust: true,
            });

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1000, 700]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, 1000, 700);
            pdf.save(`${certificate.exam_title.replace(/\s+/g, '_')}_Certificate.pdf`);

            toast.dismiss(loadingToast);
            toast.success("Certificate downloaded!");
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("Failed to download certificate");
        }
    };

    if (isLoading) return (
        <UnifiedDashboardLayout role="attender">
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Loading certificate...</div>
            </div>
        </UnifiedDashboardLayout>
    );

    if (!certificate) return (
        <UnifiedDashboardLayout role="attender">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="text-xl font-semibold">Certificate not found</div>
                <Button onClick={() => router.push('/dashboard/attender/profile')}>Back to Profile</Button>
            </div>
        </UnifiedDashboardLayout>
    );

    return (
        <UnifiedDashboardLayout role="attender">
            <Head>
                <title>Certificate | SysRank</title>
            </Head>

            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Certificate of Achievement</h1>
                        <p className="text-muted-foreground">Verified credential from SysRank</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownload} className="gap-2">
                            <Download className="w-4 h-4" />
                            Download PDF
                        </Button>
                        <Button variant="ghost" className="gap-2" onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("Link copied to clipboard!");
                        }}>
                            <Share2 className="w-4 h-4" />
                            Share
                        </Button>
                    </div>
                </div>

                {/* Certificate Container */}
                <div className="flex justify-center perspective-1000">
                    <div
                        ref={containerRef}
                        className="relative w-full max-w-[1000px] aspect-[1.414/1] bg-card text-card-foreground shadow-2xl rounded-xl overflow-hidden border-8 border-double border-muted/30"
                    >
                        {/* Certificate Content Wrapper for Capture */}
                        <div
                            ref={certificateRef}
                            className="w-full h-full relative bg-card p-12 flex flex-col items-center justify-between text-center select-none"
                            style={{
                                backgroundImage: 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)',
                                backgroundSize: '200% 200%',
                                backgroundPosition: 'center',
                                opacity: 1
                            }}
                        >
                            {/* Background Overlay to soften the gradient */}
                            <div className="absolute inset-0 bg-background/95 z-0" />

                            {/* Decorative Corner Borders */}
                            <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-primary/20 z-10" />
                            <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-primary/20 z-10" />
                            <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-primary/20 z-10" />
                            <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-primary/20 z-10" />

                            {/* Watermark */}
                            <div className="cert-watermark absolute inset-0 flex items-center justify-center z-0 opacity-[0.03] pointer-events-none overflow-hidden">
                                <div className="transform -rotate-12 text-[15vw] font-black text-foreground whitespace-nowrap">
                                    SYSRANK
                                </div>
                            </div>

                            {/* Content */}
                            <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-8">

                                {/* Top Section */}
                                <div className="space-y-6">
                                    <div className="cert-element flex justify-center">
                                        <div className="p-4 rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
                                            <Award className="w-12 h-12" />
                                        </div>
                                    </div>

                                    <div className="cert-element space-y-2">
                                        <h2 className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-medium">
                                            Certificate of Completion
                                        </h2>
                                        <p className="text-sm text-muted-foreground/80">
                                            This certifies that
                                        </p>
                                    </div>
                                </div>

                                {/* Middle Section - Name & Exam */}
                                <div className="cert-element space-y-8 w-full">
                                    <div className="relative">
                                        <h1 className="text-4xl md:text-6xl font-bold text-foreground font-serif tracking-wide py-4 border-b-2 border-primary/20 inline-block px-12">
                                            {certificate.user_name}
                                        </h1>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-lg text-muted-foreground">
                                            has successfully completed the certification exam
                                        </p>
                                        <h3 className="text-3xl font-bold text-primary">
                                            {certificate.exam_title}
                                        </h3>
                                    </div>
                                </div>

                                {/* Bottom Section - Details & Signature */}
                                <div className="cert-element w-full grid grid-cols-3 gap-8 items-end pt-12 border-t border-border/50 mt-8">

                                    {/* Date */}
                                    <div className="text-left space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Date Issued</p>
                                        <p className="font-semibold text-lg">
                                            {new Date(certificate.issue_date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Signature / Badge */}
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center bg-primary/5">
                                            <CheckCircle className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                            Verified
                                        </div>
                                    </div>

                                    {/* Score & ID */}
                                    <div className="text-right space-y-1">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Score Achieved</p>
                                        <p className="font-semibold text-lg text-primary">
                                            {certificate.score}%
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-2">
                                            ID: {certificate.id.substring(0, 8)}...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Footer */}
                <div className="text-center text-sm text-muted-foreground animate-fade-in delay-500">
                    <p>This certificate verifies that the holder has successfully passed the assessment.</p>
                    <p className="text-xs mt-1 opacity-60">SysRank Certification System • {new Date().getFullYear()}</p>
                </div>
            </div>
        </UnifiedDashboardLayout>
    );
}
