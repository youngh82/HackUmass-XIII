import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Canvas Grade Planner",
  description:
    "Calculate minimum required scores to achieve your target grade in Canvas LMS courses",
  keywords: ["canvas", "grade", "calculator", "planner", "education", "umass"],
  authors: [{ name: "Grade Planner Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
