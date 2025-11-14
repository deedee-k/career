import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function AdminDashboard() {
  const [institutions, setInstitutions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);

  const [newInstitution, setNewInstitution] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [newFaculty, setNewFaculty] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [minGPA, setMinGPA] = useState("");

  // Load all data on mount
  useEffect(() => {
    loadInstitutions();
    loadFaculties();
    loadCourses();
    loadUsers();
    loadApplications();
  }, []);

  // 🔹 Load institutions
  const loadInstitutions = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.role === "institution");
    setInstitutions(list);
  };

  // 🔹 Load faculties
  const loadFaculties = async () => {
    const snap = await getDocs(collection(db, "faculties"));
    setFaculties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 🔹 Load courses
  const loadCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 🔹 Load all users
  const loadUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 🔹 Load applications
  const loadApplications = async () => {
    const snap = await getDocs(collection(db, "applications"));
    setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 🔹 Add institution (creates an account entry)
  const addInstitution = async (e) => {
    e.preventDefault();
    if (!newInstitution.trim()) return;
    await addDoc(collection(db, "users"), {
      name: newInstitution.trim(),
      email: `${newInstitution.toLowerCase().replace(/\s/g, "")}@mail.com`,
      role: "institution",
      createdAt: new Date().toISOString(),
    });
    setNewInstitution("");
    loadInstitutions();
    alert("✅ Institution added successfully!");
  };

  const deleteInstitution = async (id) => {
    await deleteDoc(doc(db, "users", id));
    loadInstitutions();
  };

  // 🔹 Add Faculty
  const addFaculty = async (e) => {
    e.preventDefault();
    if (!selectedInstitution || !newFaculty.trim()) return;
    const inst = institutions.find((i) => i.id === selectedInstitution);
    await addDoc(collection(db, "faculties"), {
      name: newFaculty,
      institutionId: inst.id,
      institutionName: inst.name,
      createdAt: new Date().toISOString(),
    });
    setNewFaculty("");
    loadFaculties();
  };

  // 🔹 Add Course
  const addCourse = async (e) => {
    e.preventDefault();
    if (!selectedInstitution || !newCourse.trim()) return;
    const inst = institutions.find((i) => i.id === selectedInstitution);
    await addDoc(collection(db, "courses"), {
      name: newCourse,
      institutionId: inst.id,
      institutionName: inst.name,
      minGPA: parseFloat(minGPA) || 2.5,
      createdAt: new Date().toISOString(),
    });
    setNewCourse("");
    setMinGPA("");
    loadCourses();
  };

  const deleteCourse = async (id) => {
    await deleteDoc(doc(db, "courses", id));
    loadCourses();
  };

  // 🔹 Manage user accounts
  const updateUserStatus = async (id, status) => {
    const ref = doc(db, "users", id);
    await updateDoc(ref, { status });
    alert(`✅ User ${status}!`);
    loadUsers();
  };

  const deleteUser = async (id) => {
    await deleteDoc(doc(db, "users", id));
    alert("🗑 User deleted!");
    loadUsers();
  };

  // 🔹 Publish admissions (move Admitted apps → admissions)
  const publishAdmissions = async () => {
    const admitted = applications.filter((a) => a.status === "Admitted");
    for (const app of admitted) {
      await setDoc(doc(db, "admissions", `${app.studentId}-${app.institution}`), {
        studentId: app.studentId,
        institution: app.institution,
        courses: app.courses,
        date: new Date().toISOString(),
      });
    }
    alert("✅ Admissions published successfully!");
  };

  // 🔹 Quick statistics
  const countUsers = (role) => users.filter((u) => u.role === role).length;

  return (
    <div className="admin-page">
      <Navbar title="Admin Dashboard" />
      <div className="admin-content">
        <h2>🛠️ System Administration</h2>

        {/* OVERVIEW */}
        <section>
          <h3>📊 System Summary</h3>
          <div className="stats">
            <div className="stat-box">Institutions: {countUsers("institution")}</div>
            <div className="stat-box">Students: {countUsers("student")}</div>
            <div className="stat-box">Companies: {countUsers("company")}</div>
            <div className="stat-box">Applications: {applications.length}</div>
          </div>
        </section>

        {/* INSTITUTION MANAGEMENT */}
        <section>
          <h3>🏫 Manage Institutions</h3>
          <form onSubmit={addInstitution} className="form-section">
            <input
              placeholder="Institution Name"
              value={newInstitution}
              onChange={(e) => setNewInstitution(e.target.value)}
            />
            <button>Add Institution</button>
          </form>
          <ul>
            {institutions.map((i) => (
              <li key={i.id}>
                {i.name || i.email}{" "}
                <button onClick={() => deleteInstitution(i.id)}>🗑</button>
              </li>
            ))}
          </ul>
        </section>

        {/* FACULTIES & COURSES */}
        <section>
          <h3>🏢 Add Faculties & Courses</h3>
          <form onSubmit={addFaculty} className="form-section">
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
            >
              <option value="">Select Institution</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Faculty Name"
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
            />
            <button>Add Faculty</button>
          </form>

          <form onSubmit={addCourse} className="form-section">
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
            >
              <option value="">Select Institution</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Course Name"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
            />
            <input
              placeholder="Min GPA (default 2.5)"
              value={minGPA}
              onChange={(e) => setMinGPA(e.target.value)}
            />
            <button>Add Course</button>
          </form>

          <ul>
            {courses.map((c) => (
              <li key={c.id}>
                {c.name} ({c.institutionName}) — GPA ≥ {c.minGPA}{" "}
                <button onClick={() => deleteCourse(c.id)}>🗑</button>
              </li>
            ))}
          </ul>
        </section>

        {/* FACULTY LIST */}
<section>
  <h3>🏛 Faculties</h3>
  <ul>
    {faculties.map((f) => (
      <li key={f.id}>
        {f.name} ({f.institutionName})
      </li>
    ))}
  </ul>
</section>

        

        {/* MANAGE USERS */}
        <section>
          <h3>👥 Manage Users</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.status || "active"}</td>
                  <td>
                    {u.role !== "admin" && (
                      <>
                        <button onClick={() => updateUserStatus(u.id, "approved")}>Approve</button>
                        <button onClick={() => updateUserStatus(u.id, "suspended")}>Suspend</button>
                        <button onClick={() => deleteUser(u.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* PUBLISH ADMISSIONS */}
        <section>
          <h3>📢 Publish Admissions</h3>
          <button onClick={publishAdmissions}>Publish System Admissions</button>
        </section>
      </div>
    </div>
  );
}
