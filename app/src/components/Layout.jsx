import React from "react";
import { useLocation } from "react-router-dom";

export default function Layout({ children }) {
  const location = useLocation();

  // Pages that should NOT use navbar or dashboard layout
  const authPages = ["/login", "/register", "/"];

  const isAuthPage = authPages.includes(location.pathname);

  return (
    <div className={isAuthPage ? "auth-layout" : "main-layout"}>
      {children}
    </div>
  );
}
