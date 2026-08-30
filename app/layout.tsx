export const metadata = {
  title: "mcps.seracreativo.com",
  description: "Servidores MCP servidos por HTTP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
