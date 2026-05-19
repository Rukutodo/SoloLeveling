import type { Metadata } from 'next';
import './globals.css';
import './themes.css';
import SessionProvider from '@/components/SessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NotificationProvider } from '@/components/NotificationProvider';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'SoloLeveling — Personal Development System',
  description: 'Level up your life with AI-powered fitness tracking, nutrition analysis, workout plans, and financial management. Solo Leveling inspired personal development platform.',
  keywords: ['fitness', 'calorie tracker', 'workout', 'BMI', 'finance', 'personal development'],
  openGraph: {
    title: 'SoloLeveling — Personal Development System',
    description: 'Level up your life. Track fitness, nutrition, finances, and more.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sl-theme');if(t&&t!=='sololeveling'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <SessionProvider>
          <NotificationProvider>
            <ThemeProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ThemeProvider>
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
