import type { Metadata } from "next";

// Dashboard is private - don't index it
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Armory character and commitments.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
