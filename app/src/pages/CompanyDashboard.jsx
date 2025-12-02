import React from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function CompanyDashboard() {
  const links = [
    { label: "Profile", path: "/company/profile" },
    { label: "Jobs", path: "/company/jobs" },
    { label: "Applicants", path: "/company/applicants" },
  ];

  return (
    <>
      <Navbar title="Company Dashboard" />
      <Sidebar links={links} />

      <div className="main-content">
        <div className="card dashboard-card">
          <h2 className="dash-title">🏢 Company Dashboard</h2>
          <p className="dash-description">
            Post jobs, manage applications, and find top-qualified students for your roles.
          </p>

          <div className="quick-actions">
            <a href="/company/jobs" className="action-btn">📌 Manage Jobs</a>
            <a href="/company/applicants" className="action-btn">📝 View Applicants</a>
            <a href="/company/profile" className="action-btn">⚙️ Edit Profile</a>
          </div>
        </div>
      </div>
    </>
  );
}
