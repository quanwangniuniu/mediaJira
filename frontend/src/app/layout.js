import "./globals.css";
// import 'highlight.js/styles/atom-one-dark.min.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/providers/AuthProvider';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import OnboardingGate from '../components/onboarding/OnboardingGate';

export const metadata = {
  title: "MediaJira - Campaign Management",
  description: "Professional advertising campaign management platform",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
        <AuthProvider>
          <OnboardingProvider>
            <OnboardingGate>
              {children}
            </OnboardingGate>
          </OnboardingProvider>
        </AuthProvider>
        <Toaster 
          position="top-right"
          containerStyle={{
            zIndex: 999999,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
