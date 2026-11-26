import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { Assistant } from "@/components/Assistant";
import { CloudSync } from "@/components/CloudSync";
import { THEME_SCRIPT } from "@/lib/themeScript";

export const metadata: Metadata = {
  title: "JobIntel: jobs that fit your skills",
  description: "Upload your resume or list your skills to see which jobs and internships fit, what to learn next, and where to apply, based on real job postings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <CloudSync />
        <Assistant />
      </body>
    </html>
  );
}
