'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { slackApi } from '@/lib/api/slackApi';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function SlackCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setErrorMessage('Access denied or cancelled by user.');
            return;
        }

        if (!code) {
            setStatus('error');
            setErrorMessage('No authorization code received.');
            return;
        }

        const processCallback = async () => {
            try {
                await slackApi.handleCallback(code);
                setStatus('success');
                toast.success('Slack workspace connected successfully!');

                // Redirect after delay
                setTimeout(() => {
                    // Assuming user came from organization profile page
                    // Ideally we could store 'next' in state/sessionStorage before redirecting
                    router.push('/profile');
                }, 3000);

            } catch (err: any) {
                console.error('Slack OAuth Error:', err);
                setStatus('error');
                setErrorMessage(
                    err.response?.data?.error || 'Failed to complete Slack connection. Please try again.'
                );
            }
        };

        processCallback();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                {status === 'loading' && (
                    <>
                        <div className="flex justify-center">
                            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900">Connecting to Slack...</h1>
                        <p className="text-gray-500">Please wait while we finalize the setup.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="flex justify-center">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900">Connection Successful!</h1>
                        <p className="text-gray-500">
                            Your Slack workspace has been successfully linked. Redirecting you back...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="flex justify-center">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900">Connection Failed</h1>
                        <p className="text-red-500 text-sm">{errorMessage}</p>
                        <button
                            onClick={() => router.push('/profile')}
                            className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Return to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function SlackCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SlackCallbackContent />
        </Suspense>
    );
}
