import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MsalProviderWrapper from "@/components/providers/MsalProviderWrapper";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SysRank - Advanced Assessment Platform",
  description: "SysRank is a comprehensive platform for creating, managing, and taking technical assessments and coding challenges.",
  icons: {
    icon: "/logo3.png",
    shortcut: "/logo3.png",
    apple: "/logo3.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <MsalProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </MsalProviderWrapper>
      </body>
    </html>
  );
}
