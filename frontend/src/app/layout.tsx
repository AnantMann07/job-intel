import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Job Market Intelligence",
  description: "Job-market trends, skill-gap analysis and career paths from real job postings",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
