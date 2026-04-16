import React, { useState } from "react";
import { login } from "../../../api/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const user = await login(email, password);
      console.log("Logged in:", user);
      navigate("/");
      alert("Login successful ✅");
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
        onSubmit={handleLogin}
        className="relative backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl w-[360px] text-white"
      >
        <h2 className="text-3xl font-semibold mb-6 text-center tracking-wide">
          Welcome Back
        </h2>

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
          className="w-full p-3 mb-3 rounded-xl bg-white/10 border border-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <p
          className="text-right text-sm text-gray-300 cursor-pointer mb-4 hover:text-white"
          onClick={() => (window.location.href = "/forgot")}
        >
          Forgot Password?
        </p>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 transition p-3 rounded-xl font-semibold shadow-lg"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-center mt-4 text-gray-300">
          Don’t have an account?{" "}
          <span
            className="text-white cursor-pointer hover:underline"
            onClick={() => (window.location.href = "/signup")}
          >
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
}

export default Login;