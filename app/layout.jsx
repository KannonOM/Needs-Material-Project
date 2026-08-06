import "./styles.css";
import AuthSessionProvider from "../components/session-provider";

export const metadata = {
  title: "Needs Material Dashboard",
  description: "Needs Material Dashboard — Purchasing Work Queue",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
