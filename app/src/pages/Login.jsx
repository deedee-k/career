import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("⚠️ User not found. Please register again.");
        setLoading(false);
        return navigate("/register");
      }

      const data = userSnap.data();
      const role = data.role;

      switch (role) {
        case "admin":
          navigate("/admin");
          break;
        case "institution":
          navigate("/institute");
          break;
        case "company":
          navigate("/company");
          break;
        case "student":
          navigate("/student");
          break;
        default:
          alert("⚠️ Unknown role. Redirecting to home.");
          navigate("/");
      }
    } catch (error) {
      alert("❌ Login failed: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* Floating background elements */}
      <div className="floating-element"></div>
      <div className="floating-element"></div>
      <div className="floating-element"></div>

      <div className="auth-box">
        <h2>Welcome Back</h2>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="📧 Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            type="password"
            placeholder="🔑 Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                Signing In
                <span className="loading-dots"></span>
              </>
            ) : (
              "Login to Dashboard"
            )}
          </button>
        </form>

        <p className="small-text">
          Don't have an account?{" "}
          <span className="link" onClick={() => navigate("/register")}>
            Create one now
          </span>
        </p>
      </div>
    </div>
  );
}