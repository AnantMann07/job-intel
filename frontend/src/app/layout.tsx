import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobIntel: job suggestions and skill roadmaps",
  description: "Upload your resume or list your skills to get job suggestions, a skill-gap analysis and a roadmap, based on real job postings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
