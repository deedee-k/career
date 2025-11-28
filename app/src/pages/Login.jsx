import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("⚠️ User not found. Please register again.");
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
  };

  return (
    <div className="auth-container">
      <div className="auth-box login-box">
        <h2>Welcome</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p className="small-text">
          Don’t have an account?{" "}
          <span className="link" onClick={() => navigate("/register")}>
            Create one
          </span>
        </p>
      </div>
    </div>
  );
}
