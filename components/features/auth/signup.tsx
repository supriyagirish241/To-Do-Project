import React, { useState } from "react";
import { signup } from "../../../api/auth";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signup(email, password, username);
      alert("Signup successful 🎉");
      window.location.href = "/login";
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0b0f1a] relative overflow-hidden">

      {/* 🔥 Background glow blobs */}
      <div className="absolute w-72 h-72 bg-purple-500/30 blur-3xl top-10 left-10"></div>
      <div className="absolute w-72 h-72 bg-blue-500/30 blur-3xl bottom-10 right-10"></div>

      <form
        onSubmit={handleSignup}
        className="relative backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl w-[360px] text-white"
      >
        <h2 className="text-3xl font-semibold mb-6 text-center tracking-wide">
          Create Account
        </h2>

        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 mb-4 rounded-xl bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 rounded-xl bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-5 rounded-xl bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 transition p-3 rounded-xl font-semibold shadow-lg"
          disabled={loading}
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="text-sm text-center mt-4 text-gray-300">
          Already have an account?{" "}
          <span
            className="text-white cursor-pointer hover:underline"
            onClick={() => (window.location.href = "/login")}
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}

export default Signup;