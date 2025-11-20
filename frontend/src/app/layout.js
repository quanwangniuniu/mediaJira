import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/providers/AuthProvider';

export const metadata = {
  title: "MediaJira - Campaign Management",
  description: "Professional advertising campaign management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
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
