import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import "../styles/AdminSidebar.css";

// Icons
const HomeIcon = () => <span>🏠</span>;
const BuildingIcon = () => <span>🏫</span>;
const GraduationIcon = () => <span>🎓</span>;
const BookIcon = () => <span>📚</span>;
const UsersIcon = () => <span>👥</span>;
const DocumentIcon = () => <span>📄</span>;
const LogoutIcon = () => <span>🚪</span>;
const PlusIcon = () => <span>➕</span>;

export default function AdminDashboard() {
  const [institutions, setInstitutions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [newInstitution, setNewInstitution] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [newFaculty, setNewFaculty] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [minGPA, setMinGPA] = useState("");

  const [editInstitutionId, setEditInstitutionId] = useState(null);
  const [editInstitutionName, setEditInstitutionName] = useState("");
  const [editFacultyId, setEditFacultyId] = useState(null);
  const [editFacultyName, setEditFacultyName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadInstitutions(),
        loadFaculties(),
        loadCourses(),
        loadUsers(),
        loadApplications()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Error loading data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // 🏫 Load Institutions
  const loadInstitutions = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.role === "institution");
    setInstitutions(list);
  };

  // 🎓 Load Faculties
  const loadFaculties = async () => {
    const snap = await getDocs(collection(db, "faculties"));
    setFaculties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 📘 Load Courses
  const loadCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadApplications = async () => {
    const snap = await getDocs(collection(db, "applications"));
    setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    }
  };

  // ➕ Add Institution
  const addInstitution = async (e) => {
    e.preventDefault();
    if (!newInstitution.trim()) {
      alert("Please enter an institution name");
      return;
    }

    try {
      await addDoc(collection(db, "users"), {
        name: newInstitution.trim(),
        email: `${newInstitution.toLowerCase().replace(/\s/g, "")}@mail.com`,
        role: "institution",
        status: "active",
        createdAt: new Date().toISOString(),
      });

      setNewInstitution("");
      loadInstitutions();
      alert("✅ Institution added successfully!");
    } catch (error) {
      console.error("Error adding institution:", error);
      alert("Error adding institution. Please try again.");
    }
  };

  // 🗑 Delete Institution
  const deleteInstitution = async (id) => {
    if (!window.confirm("Are you sure you want to delete this institution?")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "users", id));
      loadInstitutions();
      alert("✅ Institution deleted!");
    } catch (error) {
      console.error("Error deleting institution:", error);
      alert("Error deleting institution. Please try again.");
    }
  };

  // ✏ Edit Institution
  const startEditingInstitution = (inst) => {
    setEditInstitutionId(inst.id);
    setEditInstitutionName(inst.name);
  };

  const saveInstitutionUpdate = async () => {
    if (!editInstitutionName.trim()) {
      alert("Please enter an institution name");
      return;
    }

    try {
      const ref = doc(db, "users", editInstitutionId);
      await updateDoc(ref, {
        name: editInstitutionName.trim(),
      });

      setEditInstitutionId(null);
      setEditInstitutionName("");
      loadInstitutions();
      alert("✅ Institution updated!");
    } catch (error) {
      console.error("Error updating institution:", error);
      alert("Error updating institution. Please try again.");
    }
  };

  // ➕ Add Faculty
  const addFaculty = async (e) => {
    e.preventDefault();
    if (!selectedInstitution || !newFaculty.trim()) {
      alert("Please select an institution and enter a faculty name");
      return;
    }

    try {
      const inst = institutions.find((i) => i.id === selectedInstitution);

      await addDoc(collection(db, "faculties"), {
        name: newFaculty,
        institutionId: inst.id,
        institutionName: inst.name,
        createdAt: new Date().toISOString(),
      });

      setNewFaculty("");
      loadFaculties();
      alert("✅ Faculty added successfully!");
    } catch (error) {
      console.error("Error adding faculty:", error);
      alert("Error adding faculty. Please try again.");
    }
  };

  // 🗑 Delete Faculty
  const deleteFaculty = async (id) => {
    if (!window.confirm("Are you sure you want to delete this faculty?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "faculties", id));
      loadFaculties();
      alert("✅ Faculty deleted!");
    } catch (error) {
      console.error("Error deleting faculty:", error);
      alert("Error deleting faculty. Please try again.");
    }
  };

  // ✏ Edit Faculty
  const startEditingFaculty = (f) => {
    setEditFacultyId(f.id);
    setEditFacultyName(f.name);
  };

  const saveFacultyUpdate = async () => {
    if (!editFacultyName.trim()) {
      alert("Please enter a faculty name");
      return;
    }

    try {
      const ref = doc(db, "faculties", editFacultyId);
      await updateDoc(ref, {
        name: editFacultyName.trim(),
      });

      setEditFacultyId(null);
      setEditFacultyName("");
      loadFaculties();
      alert("✅ Faculty updated!");
    } catch (error) {
      console.error("Error updating faculty:", error);
      alert("Error updating faculty. Please try again.");
    }
  };

  // ➕ Add Course
  const addCourse = async (e) => {
    e.preventDefault();
    if (!selectedInstitution || !newCourse.trim()) {
      alert("Please select an institution and enter a course name");
      return;
    }

    try {
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
      alert("✅ Course added successfully!");
    } catch (error) {
      console.error("Error adding course:", error);
      alert("Error adding course. Please try again.");
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "courses", id));
      loadCourses();
      alert("✅ Course deleted!");
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Error deleting course. Please try again.");
    }
  };

  const updateUserStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "users", id), { status });
      loadUsers();
      alert(`✅ User status updated to ${status}`);
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Error updating user status. Please try again.");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", id));
      loadUsers();
      alert("✅ User deleted!");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user. Please try again.");
    }
  };

  const publishAdmissions = async () => {
    const admitted = applications.filter((a) => a.status === "Admitted");
    
    if (admitted.length === 0) {
      alert("No admitted students to publish");
      return;
    }

    try {
      for (const app of admitted) {
        await setDoc(doc(db, "admissions", `${app.studentId}-${app.institution}`), {
          studentId: app.studentId,
          institution: app.institution,
          courses: app.courses,
          date: new Date().toISOString(),
          status: "published",
        });
      }

      alert(`✅ ${admitted.length} admissions published successfully!`);
    } catch (error) {
      console.error("Error publishing admissions:", error);
      alert("Error publishing admissions. Please try again.");
    }
  };

  const countUsers = (role) => users.filter((u) => u.role === role).length;

  // Main content renderer based on active section
  const renderContent = () => {
    if (loading) {
      return (
        <section className="loading">
          <div>Loading data...</div>
        </section>
      );
    }

    switch (activeSection) {
      case "institutions":
        return (
          <section>
            <h3><BuildingIcon /> Manage Institutions</h3>

            <form onSubmit={addInstitution} className="form-section">
              <input
                placeholder="Institution Name"
                value={newInstitution}
                onChange={(e) => setNewInstitution(e.target.value)}
              />
              <button><PlusIcon /> Add Institution</button>
            </form>

            {institutions.length === 0 ? (
              <div className="no-data">No institutions found. Add your first institution above.</div>
            ) : (
              <ul>
                {institutions.map((i) => (
                  <li key={i.id}>
                    {editInstitutionId === i.id ? (
                      <>
                        <input
                          value={editInstitutionName}
                          onChange={(e) => setEditInstitutionName(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button onClick={saveInstitutionUpdate}>💾 Save</button>
                        <button onClick={() => setEditInstitutionId(null)}>✖ Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1 }}>{i.name}</span>
                        <div>
                          <button onClick={() => startEditingInstitution(i)}>✏ Edit</button>
                          <button onClick={() => deleteInstitution(i.id)}>🗑 Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );

      case "faculties":
        return (
          <section>
            <h3><GraduationIcon /> Manage Faculties</h3>

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

              <button><PlusIcon /> Add Faculty</button>
            </form>

            {faculties.length === 0 ? (
              <div className="no-data">No faculties found. Add your first faculty above.</div>
            ) : (
              <ul>
                {faculties.map((f) => (
                  <li key={f.id}>
                    {editFacultyId === f.id ? (
                      <>
                        <input
                          value={editFacultyName}
                          onChange={(e) => setEditFacultyName(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button onClick={saveFacultyUpdate}>💾 Save</button>
                        <button onClick={() => setEditFacultyId(null)}>✖ Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1 }}>{f.name} ({f.institutionName})</span>
                        <div>
                          <button onClick={() => startEditingFaculty(f)}>✏ Edit</button>
                          <button onClick={() => deleteFaculty(f.id)}>🗑 Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );

      case "courses":
        return (
          <section>
            <h3><BookIcon /> Manage Courses</h3>

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
                placeholder="Minimum GPA"
                value={minGPA}
                onChange={(e) => setMinGPA(e.target.value)}
              />

              <button><PlusIcon /> Add Course</button>
            </form>

            {courses.length === 0 ? (
              <div className="no-data">No courses found. Add your first course above.</div>
            ) : (
              <ul>
                {courses.map((c) => (
                  <li key={c.id}>
                    <span style={{ flex: 1 }}>{c.name} ({c.institutionName}) — GPA ≥ {c.minGPA}</span>
                    <button onClick={() => deleteCourse(c.id)}>🗑 Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );

      case "users":
        return (
          <section>
            <h3><UsersIcon /> Manage Users</h3>
            {users.length === 0 ? (
              <div className="no-data">No users found.</div>
            ) : (
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
                            <button onClick={() => updateUserStatus(u.id, "approved")}>
                              Approve
                            </button>
                            <button onClick={() => updateUserStatus(u.id, "suspended")}>
                              Suspend
                            </button>
                            <button onClick={() => deleteUser(u.id)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );

      case "admissions":
        return (
          <section>
            <h3><DocumentIcon /> Publish Admissions</h3>
            <p>Total Applications: {applications.length}</p>
            <p>Admitted Students: {applications.filter(a => a.status === "Admitted").length}</p>
            <button className="publish-btn" onClick={publishAdmissions}>
              📢 Publish Admissions
            </button>
          </section>
        );

      case "dashboard":
      default:
        return (
          <>
            {/* SUMMARY */}
            <section>
              <h3><HomeIcon /> System Summary</h3>
              <div className="stats">
                <div className="stat-box" onClick={() => setActiveSection("institutions")}>
                  <h4>Institutions</h4>
                  <p>{countUsers("institution")}</p>
                </div>
                <div className="stat-box" onClick={() => setActiveSection("users")}>
                  <h4>Students</h4>
                  <p>{countUsers("student")}</p>
                </div>
                <div className="stat-box">
                  <h4>Companies</h4>
                  <p>{countUsers("company")}</p>
                </div>
                <div className="stat-box" onClick={() => setActiveSection("admissions")}>
                  <h4>Applications</h4>
                  <p>{applications.length}</p>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <h3>🚀 Quick Actions</h3>
              <div className="quick-actions">
                <button 
                  className="action-btn"
                  onClick={() => setActiveSection('institutions')}
                  style={{ background: 'linear-gradient(135deg, #7a5cff, #5a3dcc)' }}
                >
                  <PlusIcon /> Add Institution
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveSection('faculties')}
                  style={{ background: 'linear-gradient(135deg, #00c9a7, #00a98e)' }}
                >
                  <PlusIcon /> Add Faculty
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveSection('courses')}
                  style={{ background: 'linear-gradient(135deg, #ff6b8b, #ff4757)' }}
                >
                  <PlusIcon /> Add Course
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveSection('users')}
                  style={{ background: 'linear-gradient(135deg, #ffb86c, #ffa94d)' }}
                >
                  👥 Manage Users
                </button>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h3>📈 Recent Activity</h3>
              <ul>
                <li>🆕 New applications: {applications.length}</li>
                <li>📚 Total courses: {courses.length}</li>
                <li>🏛 Total faculties: {faculties.length}</li>
                <li>👥 Total users: {users.length}</li>
                <li>✅ Active institutions: {countUsers("institution")}</li>
              </ul>
            </section>
          </>
        );
    }
  };

  return (
    <div className="admin-page">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-logo">
          <h2>🏛 Admin</h2>
        </div>
        
        <nav className="admin-nav">
          <ul>
            <li>
              <a 
                href="#!" 
                className={activeSection === "dashboard" ? "active" : ""}
                onClick={() => setActiveSection("dashboard")}
              >
                <HomeIcon /> Dashboard
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={activeSection === "institutions" ? "active" : ""}
                onClick={() => setActiveSection("institutions")}
              >
                <BuildingIcon /> Institutions
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={activeSection === "faculties" ? "active" : ""}
                onClick={() => setActiveSection("faculties")}
              >
                <GraduationIcon /> Faculties
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={activeSection === "courses" ? "active" : ""}
                onClick={() => setActiveSection("courses")}
              >
                <BookIcon /> Courses
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={activeSection === "users" ? "active" : ""}
                onClick={() => setActiveSection("users")}
              >
                <UsersIcon /> Users
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={activeSection === "admissions" ? "active" : ""}
                onClick={() => setActiveSection("admissions")}
              >
                <DocumentIcon /> Admissions
              </a>
            </li>
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="logout-section">
          <button className="logout-btn" onClick={handleLogout}>
            <LogoutIcon /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        <h2>🛠️ Admin Dashboard</h2>
        {renderContent()}
      </div>
    </div>
  );
}