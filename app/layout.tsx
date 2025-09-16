import type React from "react"
import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { LanguageProvider } from "@/contexts/language-context"
import { AuthThemeLoader } from "@/components/auth-theme-loader"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
})

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Brankas Pribadi - Budget Pribadi",
  description: "Aplikasi budget pribadi dengan desain neobrutalism",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable} ${manrope.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={["light", "dark", "pink", "blue", "green", "blackwhite"]}
          enableSystem={true}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <AuthThemeLoader />
              {children}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
