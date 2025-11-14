import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Student from "./pages/Student";
import Institute from "./pages/Institute";
import Company from "./pages/Company";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import "./App.css";

// 🔐 Protect routes by role
function ProtectedRoute({ children, role }) {
  const [allowed, setAllowed] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return setAllowed(false);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) return setAllowed(false);

      const userRole = snap.data().role;
      setAllowed(userRole === role);
    });

    return () => unsubscribe();
  }, []);

  if (allowed === null) return <p>Loading...</p>;
  if (!allowed) return <Navigate to="/login" />;

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboards */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <Student />
            </ProtectedRoute>
          }
        />

        <Route
          path="/institute"
          element={
            <ProtectedRoute role="institution">
              <Institute />
            </ProtectedRoute>
          }
        />

        <Route
          path="/company"
          element={
            <ProtectedRoute role="company">
              <Company />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
