import React from "react";

export default function StudentSidebar({ currentPage, setCurrentPage }) {
  return (
    <div className="sidebar">
      <h2>Dashboard</h2>
      <ul>
        <li
          className={currentPage === "profile" ? "active" : ""}
          onClick={() => setCurrentPage("profile")}
        >
          Profile
        </li>
        <li
          className={currentPage === "courses" ? "active" : ""}
          onClick={() => setCurrentPage("courses")}
        >
          Apply Courses
        </li>
        <li
          className={currentPage === "admissions" ? "active" : ""}
          onClick={() => setCurrentPage("admissions")}
        >
          Admissions
        </li>
        <li
          className={currentPage === "jobs" ? "active" : ""}
          onClick={() => setCurrentPage("jobs")}
        >
          Job Opportunities
        </li>
      </ul>
    </div>
  );
}
