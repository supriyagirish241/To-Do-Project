import React, { useState } from "react";
import { forgotPassword } from "../../../api/auth";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await forgotPassword(email);
      alert("Reset link sent to your email 📩");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0b0f1a] relative overflow-hidden">

      {/* 🔥 SAME BACKGROUND GLOW */}
      <div className="absolute w-72 h-72 bg-purple-500/30 blur-3xl top-10 left-10"></div>
      <div className="absolute w-72 h-72 bg-blue-500/30 blur-3xl bottom-10 right-10"></div>

      <form
        onSubmit={handleReset}
        className="relative backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl w-[360px] text-white"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Reset Password
        </h2>

        <p className="text-sm text-gray-300 mb-4 text-center">
          Enter your email to receive a reset link
        </p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-5 rounded-xl bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 transition p-3 rounded-xl font-semibold shadow-lg"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <p
          className="text-sm text-center mt-4 text-gray-300 cursor-pointer hover:text-white"
          onClick={() => (window.location.href = "/login")}
        >
          ← Back to Login
        </p>
      </form>
    </div>
  );
}

export default ForgotPassword;