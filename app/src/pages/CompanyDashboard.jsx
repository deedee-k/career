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
      <Navbar />
      <Sidebar links={links} />
      <div className="main-content">
        <div className="card">
          <h2>🏢 Company Dashboard</h2>
          <p>Post jobs, review applicants, and find students that fit your criteria.</p>
        </div>
      </div>
    </>
  );
}
