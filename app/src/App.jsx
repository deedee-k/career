import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Student from "./pages/Student";
import Institute from "./pages/Institute";
import Company from "./pages/Company";
import MobileMenuToggle from "./components/Mobile";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import "./global.css";

// Create a context for mobile menu state
const MobileMenuContext = createContext();

// Custom hook to use mobile menu context
export const useMobileMenu = () => useContext(MobileMenuContext);

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

// Mobile menu provider component
function MobileMenuProvider({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [window.location.pathname]);

  const value = {
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isMobileView
  };

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

// Mobile menu wrapper for dashboard pages
function DashboardLayout({ children }) {
  const { isMobileView, isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();

  return (
    <div className="dashboard-layout">
      {isMobileView && (
        <MobileMenuToggle 
          isOpen={isMobileMenuOpen}
          onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      )}
      {children}
    </div>
  );
}

export default function App() {
  return (
    <MobileMenuProvider>
      <Router>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboards with mobile menu wrapper */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <DashboardLayout>
                  <Admin />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <DashboardLayout>
                  <Student />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/institute"
            element={
              <ProtectedRoute role="institution">
                <DashboardLayout>
                  <Institute />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/company"
            element={
              <ProtectedRoute role="company">
                <DashboardLayout>
                  <Company />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </MobileMenuProvider>
  );
}