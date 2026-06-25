"use client";

import { useState } from "react";

interface ApproveMandateProps {
  /** The redirect URL returned by the backend's GNAP grant initiation */
  interactRedirectUrl: string;
  onApproved?: () => void;
}

/**
 * ApproveMandate — shows the user details of the spending mandate
 * and redirects them to the wallet's consent screen.
 */
export default function ApproveMandate({ interactRedirectUrl, onApproved }: ApproveMandateProps) {
  const [approved, setApproved] = useState(false);

  const handleApprove = () => {
    setApproved(true);
    onApproved?.();
    // Redirect user to wallet provider's interactive consent page
    window.location.href = interactRedirectUrl;
  };

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem" }}>
      <h2>Approve Spending Mandate</h2>
      <p>
        By approving, you authorise PavelPayments to deduct small amounts on your behalf each time
        you use the service (e.g., passing a turnstile).
      </p>
      <ul style={{ marginBottom: "1rem" }}>
        <li>Access type: <strong>Outgoing Payment</strong></li>
        <li>Spend limit: set by your provider</li>
        <li>Revocable at any time from your wallet</li>
      </ul>
      {!approved ? (
        <button onClick={handleApprove} style={{ background: "#0070f3", color: "#fff", padding: "0.5rem 1.25rem", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Approve &amp; Continue
        </button>
      ) : (
        <p style={{ color: "green" }}>Redirecting to your wallet…</p>
      )}
    </div>
  );
}
