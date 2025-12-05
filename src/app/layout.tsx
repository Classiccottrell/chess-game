import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "GitHub Chess",
    description: "Play chess with GitHub users",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
