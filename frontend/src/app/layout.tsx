import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({ subsets: ['latin'], display: 'swap' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://edustream-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'EduStream AI — Transform Videos Into Knowledge',
    template: '%s | EduStream AI',
  },
  description: 'AI-powered learning assistant that transforms educational videos into instant summaries, interactive quizzes, flashcards, mind maps, and study chats. Paste a YouTube URL or upload your lectures.',
  keywords: ['AI video learning', 'video summarizer', 'educational AI', 'YouTube study tool', 'AI quiz generator', 'video to notes', 'lecture summarizer', 'study assistant'],
  authors: [{ name: 'EduStream AI' }],
  creator: 'EduStream AI',
  publisher: 'EduStream AI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'EduStream AI',
    title: 'EduStream AI — Transform Videos Into Knowledge',
    description: 'AI-powered learning assistant. Instant summaries, quizzes, flashcards, and study chats from any video or lecture.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'EduStream AI Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduStream AI — Transform Videos Into Knowledge',
    description: 'AI-powered learning assistant. Instant summaries, quizzes, flashcards, and study chats from any video or lecture.',
    images: ['/logo.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EduStream AI',
    description: 'AI-powered learning assistant that transforms educational videos into structured knowledge.',
    url: siteUrl,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#6366f1" />
        <link rel="canonical" href={siteUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-secondary text-gray-900 antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
