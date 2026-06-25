import type { Metadata } from "next";
import ConnectWallet from "../components/ConnectWallet";

export const metadata: Metadata = {
  title: "PavelPayments — Dashboard",
};

export default function DashboardPage() {
  return (
    <main style={{ maxWidth: "640px", margin: "4rem auto", fontFamily: "sans-serif" }}>
      <h1>PavelPayments</h1>
      <p>Connect your Open Payments wallet to get started.</p>
      <ConnectWallet />
    </main>
  );
}
