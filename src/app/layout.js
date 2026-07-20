import "./globals.css";

export const metadata = {
  title: "Autism Video Review Platform",
  description: "Secure, professional observation and psychologist review platform for early child development assessment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧩</text></svg>" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
