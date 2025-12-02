import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const navigate = useNavigate();

  const roles = [
    { id: "student", label: "Student", icon: "🎓", desc: "Apply to courses and jobs" },
    { id: "institution", label: "Institution", icon: "🏫", desc: "Manage courses and admissions" },
    { id: "company", label: "Company", icon: "💼", desc: "Post jobs and hire talent" },
    { id: "admin", label: "Admin", icon: "⚙️", desc: "System administration" }
  ];

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    
    // Simple password strength calculation
    let strength = 0;
    if (value.length >= 6) strength += 25;
    if (/[A-Z]/.test(value)) strength += 25;
    if (/[0-9]/.test(value)) strength += 25;
    if (/[^A-Za-z0-9]/.test(value)) strength += 25;
    
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return "#00c9a7";
    if (passwordStrength >= 50) return "#ffb86c";
    return "#ff6b8b";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength >= 75) return "Strong";
    if (passwordStrength >= 50) return "Medium";
    if (passwordStrength > 0) return "Weak";
    return "";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role,
        createdAt: new Date().toISOString(),
        status: "active"
      });

      alert("🎉 Account created successfully!");
      navigate("/login");
    } catch (error) {
      alert("❌ Registration failed: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      {/* Floating background elements */}
      <div className="floating-element"></div>
      <div className="floating-element"></div>
      <div className="floating-element"></div>

      <div className="auth-box register-box">
        <h2>Join Our Platform</h2>

        <form onSubmit={handleRegister} className="register-form">
          <input
            type="email"
            placeholder="📧 Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <div>
            <input
              type="password"
              placeholder="🔑 Password (min 6 characters)"
              value={password}
              onChange={handlePasswordChange}
              required
              disabled={loading}
            />
            
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: `${passwordStrength}%`,
                      background: getPasswordStrengthColor()
                    }}
                  ></div>
                </div>
                <div className="strength-text">
                  Password strength: {getPasswordStrengthText()}
                </div>
              </div>
            )}
          </div>

          <div className="role-selector">
            <label>Select Your Role</label>
            <div className="role-icons">
              {roles.map((roleItem) => (
                <div
                  key={roleItem.id}
                  className={`role-icon ${role === roleItem.id ? 'selected' : ''}`}
                  onClick={() => !loading && setRole(roleItem.id)}
                >
                  <span>{roleItem.icon}</span>
                  <span>{roleItem.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                Creating Account
                <span className="loading-dots"></span>
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="small-text">
          Already have an account?{" "}
          <span className="link" onClick={() => navigate("/login")}>
            Login here
          </span>
        </p>
      </div>
    </div>
  );
}