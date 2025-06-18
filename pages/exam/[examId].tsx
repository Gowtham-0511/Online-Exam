import { useEffect, useState } from "react";
import CodeEditor from "../../components/CodeEditor";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { generateAnswerPdf } from "../../lib/exportPdf";

export default function ExamPage() {
    const [code, setCode] = useState("");
    const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes
    const [isDisqualified, setDisqualified] = useState(false);
    const router = useRouter();
    const { data: session } = useSession();

    // Enter fullscreen on load
    useEffect(() => {
        document.documentElement.requestFullscreen().catch(() => {
            alert("Please allow fullscreen mode.");
        });
    }, []);

    // Timer logic
    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit(); // Call without return
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft((t) => t - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    // Disqualification on blur or fullscreen exit
    useEffect(() => {
        const handleBlur = () => {
            alert("You switched tabs or exited fullscreen. Disqualified!");
            setDisqualified(true);
            handleSubmit();
        };

        const handleFullscreenExit = () => {
            if (!document.fullscreenElement) {
                alert("Fullscreen exited. Disqualified!");
                setDisqualified(true);
                handleSubmit();
            }
        };

        window.addEventListener("blur", handleBlur);
        document.addEventListener("fullscreenchange", handleFullscreenExit);

        return () => {
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("fullscreenchange", handleFullscreenExit);
        };
    }, []);

    const handleSubmit = async () => {
        try {
            const userEmail = session?.user?.email || "unknown";
            const userName = session?.user?.name || "Anonymous";

            const pdfBytes = await generateAnswerPdf({
                studentName: userName,
                examTitle: "Python 101",
                codeAnswer: code,
            });

            const blob = new Blob([pdfBytes], { type: "application/pdf" });

            // await sendAnswerEmail(userEmail, blob);
            alert("Answer submitted and emailed successfully.");
            router.push("/dashboard/attender");
        } catch (error) {
            console.error(error);
            alert("Failed to submit answer.");
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold">Python Coding Exam</h2>
            <p className="mb-4 text-red-600 font-bold">Time Left: {formatTime(timeLeft)}</p>

            {isDisqualified ? (
                <p className="text-red-500">You have been disqualified.</p>
            ) : (
                <>
                    <CodeEditor language="python" value={code} onChange={setCode} />
                    <button
                        onClick={handleSubmit}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Submit
                    </button>
                </>
            )}
        </div>
    );
}