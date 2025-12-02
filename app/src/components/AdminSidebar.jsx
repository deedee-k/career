import React from "react";
import "../styles/AdminSidebar.css";

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const items = [
    { key: "summary", label: "Summary" },
    { key: "institutions", label: "Institutions" },
    { key: "faculties", label: "Faculties" },
    { key: "courses", label: "Courses" },
    { key: "users", label: "Users" },
    { key: "admissions", label: "Admissions" },
  ];

  return (
    <div className="admin-sidebar">
      <h2>Admin Panel</h2>
      <ul>
        {items.map((item) => (
          <li
            key={item.key}
            className={activeTab === item.key ? "active" : ""}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
