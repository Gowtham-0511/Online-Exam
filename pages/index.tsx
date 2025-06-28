import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createOrFetchUser } from "../lib/authUtils";
import Head from "next/head";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const redirectByRole = async () => {
      if (session?.user?.email) {
        const user = await createOrFetchUser(session.user.email, session.user.name || "");
        router.push(`/dashboard/${user.role}`);
      }
    };

    redirectByRole();
  }, [session, router]);

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Exam Hub</title>
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-200/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-slate-200/40 rounded-full blur-lg animate-pulse delay-500"></div>
        </div>

        <main className="relative z-10 w-full max-w-md">
          {/* Main card */}
          <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 p-8 space-y-8 transform transition-all duration-300 hover:shadow-3xl hover:shadow-blue-500/20">

            {/* Header section */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Online Exam App
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                  Your gateway to seamless online assessments
                </p>
              </div>
            </div>

            {/* Content section */}
            <div className="space-y-6">
              {session ? (
                <>
                  {/* Signed in state */}
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <div>
                      <p className="text-slate-600 font-medium">Welcome back!</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Signed in as <span className="font-semibold text-slate-700">{session.user?.email}</span>
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-slate-400 mb-4">Redirecting to your dashboard...</p>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-200/50"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {/* Sign in state */}
                  <div className="text-center space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-slate-800">Ready to get started?</h2>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Choose your preferred sign-in method to access your personalized exam dashboard
                      </p>
                    </div>
                  </div>

                  {/* Login buttons */}
                  <div className="space-y-3">
                    {/* Google Sign In */}
                    <button
                      onClick={() => handleSignIn("google")}
                      disabled={isLoading}
                      className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-gray-200/50 flex items-center justify-center space-x-3 border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
                    </button>

                    {/* Outlook Sign In */}
                    <button
                      onClick={() => handleSignIn("azure-ad")}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200/50 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M0 0h11.377v11.372H0V0zm12.623 0H24v11.372H12.623V0zM0 12.623h11.377V24H0V12.623zm12.623 0H24V24H12.623V12.623z" />
                      </svg>
                      <span>{isLoading ? 'Signing in...' : 'Continue with Outlook'}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">Secure authentication</span>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="text-center">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      By signing in, you agree to our terms of service and privacy policy
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-slate-400">
              Secure • Reliable • Multi-Platform
            </p>
          </div>
        </main>
      </div>
    </>
  );
}