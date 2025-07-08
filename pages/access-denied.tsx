export default function AccessDenied() {
    return (
        <div className="min-h-screen flex items-center justify-center text-center px-4">
            <div>
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="mt-4 text-gray-600">
                    Your access schedule has expired or your account is inactive.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                    Please contact the administrator for assistance.
                </p>
            </div>
        </div>
    );
}
