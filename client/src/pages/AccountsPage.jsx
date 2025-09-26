import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AccountsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get("success");

    console.log(success);
    

    if (success) {
      // Show toast or message that Twitter/LinkedIn connected successfully
      alert(`${success} account connected!`);
      // Optionally, redirect to dashboard
      navigate("/dashboard");
    }
  }, []);

  return (
    <div className="p-4">
      <h1>Connected Accounts</h1>
      <p>Managing your connected social accounts...</p>
    </div>
  );
}
