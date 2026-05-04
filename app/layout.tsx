import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

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
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
