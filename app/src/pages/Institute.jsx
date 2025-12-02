import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import "../styles/Institution.css";

// Icons
const HomeIcon = () => <span className="nav-icon">🏠</span>;
const ProfileIcon = () => <span className="nav-icon">🏢</span>;
const FacultyIcon = () => <span className="nav-icon">📘</span>;
const CourseIcon = () => <span className="nav-icon">📚</span>;
const ApplicationsIcon = () => <span className="nav-icon">🎓</span>;
const LogoutIcon = () => <span>🚪</span>;
const BuildingIcon = () => <span className="card-icon">🏢</span>;
const BooksIcon = () => <span className="card-icon">📚</span>;
const UsersIcon = () => <span className="card-icon">👥</span>;
const ChartIcon = () => <span className="card-icon">📊</span>;

export default function InstitutionDashboard() {
  const [institution, setInstitution] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({});
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  // Form states
  const [newFaculty, setNewFaculty] = useState("");
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [editingFacultyName, setEditingFacultyName] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingCourseName, setEditingCourseName] = useState("");
  const [minGPA, setMinGPA] = useState("");

  const navigate = useNavigate();

  // Load institution on auth change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await loadInstitution(user.uid);
      } else {
        console.log("⚠️ No user logged in");
      }
    });
    return () => unsubscribe();
  }, []);

  const loadInstitution = async (uid) => {
    try {
      setLoading(true);
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setInstitution(data);
        setProfile(data);
        await Promise.all([
          loadFaculties(data.id),
          loadCourses(data.id),
          loadApplications(data.name),
        ]);
      } else {
        alert("⚠️ No institution record found. Please register as an Institution.");
        setInstitution({ name: "Unknown Institution", id: uid });
      }
    } catch (err) {
      console.error("Error loading institution:", err);
      alert("❌ Failed to load institution data.");
    } finally {
      setLoading(false);
    }
  };

  // FACULTIES
  const loadFaculties = async (institutionId) => {
    try {
      const q = query(collection(db, "faculties"), where("institutionId", "==", institutionId));
      const snap = await getDocs(q);
      setFaculties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading faculties:", err);
    }
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    if (!newFaculty.trim() || !institution) {
      alert("Please enter a faculty name.");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "faculties"), {
        name: newFaculty.trim(),
        institutionId: institution.id,
        institutionName: profile.name || institution.name || "Unnamed Institution",
        createdAt: new Date().toISOString(),
      });
      setNewFaculty("");
      await loadFaculties(institution.id);
      alert("✅ Faculty added successfully!");
    } catch (err) {
      console.error("Error adding faculty:", err);
      alert("❌ Failed to add faculty: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditFaculty = (f) => {
    setEditingFacultyId(f.id);
    setEditingFacultyName(f.name);
  };

  const saveFaculty = async () => {
    if (!editingFacultyName.trim()) return alert("Faculty name cannot be empty.");
    try {
      setLoading(true);
      const ref = doc(db, "faculties", editingFacultyId);
      await updateDoc(ref, { name: editingFacultyName.trim() });
      setEditingFacultyId(null);
      setEditingFacultyName("");
      await loadFaculties(institution.id);
      alert("✅ Faculty updated!");
    } catch (err) {
      console.error("Error updating faculty:", err);
      alert("❌ Failed to update faculty: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFaculty = async (id) => {
    const ok = window.confirm("Delete faculty? This cannot be undone.");
    if (!ok) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "faculties", id));
      await loadFaculties(institution.id);
    } catch (err) {
      console.error("Error deleting faculty:", err);
      alert("❌ Failed to delete faculty: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // COURSES
  const loadCourses = async (institutionId) => {
    try {
      const q = query(collection(db, "courses"), where("institutionId", "==", institutionId));
      const snap = await getDocs(q);
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading courses:", err);
    }
  };

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.trim() || !selectedFaculty || !institution) {
      alert("Please select a faculty and provide a course name.");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "courses"), {
        name: newCourse.trim(),
        facultyId: selectedFaculty,
        facultyName: faculties.find((f) => f.id === selectedFaculty)?.name || "",
        institutionId: institution.id,
        institutionName: profile.name || institution.name || "Unnamed Institution",
        minGPA: parseFloat(minGPA) || 2.5,
        createdAt: new Date().toISOString(),
      });
      setNewCourse("");
      setMinGPA("");
      await loadCourses(institution.id);
      alert("✅ Course added successfully!");
    } catch (err) {
      console.error("Error adding course:", err);
      alert("❌ Failed to add course: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditCourse = (c) => {
    setEditingCourseId(c.id);
    setEditingCourseName(c.name);
    setMinGPA(String(c.minGPA || ""));
    setSelectedFaculty(c.facultyId || "");
  };

  const saveCourse = async () => {
    if (!editingCourseName.trim() || !selectedFaculty) {
      alert("Fill course name and faculty before saving.");
      return;
    }
    try {
      setLoading(true);
      const ref = doc(db, "courses", editingCourseId);
      await updateDoc(ref, {
        name: editingCourseName.trim(),
        facultyId: selectedFaculty,
        facultyName: faculties.find((f) => f.id === selectedFaculty)?.name || "",
        minGPA: parseFloat(minGPA) || 2.5,
      });
      setEditingCourseId(null);
      setEditingCourseName("");
      setSelectedFaculty("");
      setMinGPA("");
      await loadCourses(institution.id);
      alert("✅ Course updated!");
    } catch (err) {
      console.error("Error updating course:", err);
      alert("❌ Failed to update course: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (id) => {
    const ok = window.confirm("Delete course? This cannot be undone.");
    if (!ok) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "courses", id));
      await loadCourses(institution.id);
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("❌ Failed to delete course: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // APPLICATIONS
  const loadApplications = async (institutionName) => {
    try {
      const q = query(collection(db, "applications"), where("institution", "==", institutionName));
      const snap = await getDocs(q);
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading applications:", err);
    }
  };

  const updateApplicationStatus = async (id, status) => {
    try {
      setLoading(true);
      const ref = doc(db, "applications", id);
      await updateDoc(ref, { status });
      await loadApplications(institution.name);
      alert(`✅ Application ${status.toLowerCase()}!`);
    } catch (err) {
      console.error("Error updating application:", err);
      alert("❌ Failed to update status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // PUBLISH ADMISSIONS
  const publishAdmissions = async () => {
    const admitted = applications.filter((a) => a.status === "Admitted");
    if (admitted.length === 0) {
      alert("No admitted students to publish.");
      return;
    }

    try {
      setLoading(true);
      for (const app of admitted) {
        await setDoc(doc(db, "admissions", `${app.studentId}-${app.institution}`), {
          studentId: app.studentId,
          institution: app.institution,
          courses: app.courses,
          date: new Date().toISOString(),
        });
      }
      alert(`✅ ${admitted.length} admissions published successfully!`);
    } catch (err) {
      console.error("Error publishing admissions:", err);
      alert("❌ Error publishing admissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // PROFILE
  const updateProfile = async (e) => {
    e.preventDefault();
    if (!institution) return;
    try {
      setLoading(true);
      const ref = doc(db, "users", institution.id);
      const updated = {
        name: profile.name || institution.name || "Unnamed Institution",
        email: institution.email,
        role: "institution",
        about: profile.about || "",
        location: profile.location || "",
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(ref, updated);
      await loadInstitution(institution.id);
      alert("✅ Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("❌ Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // HANDLE LOGOUT
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    }
  };

  // RENDER CONTENT
  const renderContent = () => {
    if (!institution) {
      return (
        <div className="loading-state">
          <div>Loading Institution Dashboard...</div>
        </div>
      );
    }

    if (loading && activeSection === "dashboard") {
      return (
        <div className="loading-state">
          <div>Loading data...</div>
        </div>
      );
    }

    switch (activeSection) {
      case "profile":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <BuildingIcon />
              <h2 className="card-title">Institution Profile</h2>
            </div>
            
            <form onSubmit={updateProfile} className="modern-form">
              <div className="form-group full-width">
                <label className="form-label">Institution Name</label>
                <input
                  className="form-input"
                  placeholder="Your Institution Name"
                  value={profile.name || ""}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  className="form-input"
                  placeholder="City, Country"
                  value={profile.location || ""}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  value={institution.email || ""}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">About the Institution</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tell us about your institution, mission, and values..."
                  value={profile.about || ""}
                  onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                  rows="4"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        );

      case "faculties":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <BooksIcon />
              <h2 className="card-title">Manage Faculties</h2>
            </div>
            
            <form onSubmit={addFaculty} className="modern-form">
              <div className="form-group full-width">
                <label className="form-label">
                  {editingFacultyId ? "Edit Faculty Name" : "Add New Faculty"}
                </label>
                <input
                  className="form-input"
                  placeholder="Faculty Name"
                  value={editingFacultyId ? editingFacultyName : newFaculty}
                  onChange={(e) => {
                    if (editingFacultyId) setEditingFacultyName(e.target.value);
                    else setNewFaculty(e.target.value);
                  }}
                  required
                />
              </div>
              
              <div className="form-actions">
                {editingFacultyId ? (
                  <>
                    <button
                      type="button"
                      onClick={saveFaculty}
                      className="submit-btn"
                      disabled={loading}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFacultyId(null);
                        setEditingFacultyName("");
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="submit" className="submit-btn" disabled={loading}>
                    Add Faculty
                  </button>
                )}
              </div>
            </form>
            
            <div className="list-items">
              {faculties.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-icon">📘</div>
                  <h3>No Faculties Yet</h3>
                  <p>Create your first faculty to start organizing courses.</p>
                </div>
              ) : (
                faculties.map((f) => (
                  <div className="list-item" key={f.id}>
                    <div className="item-content">
                      <h4>{f.name}</h4>
                      <p>Created: {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ""}</p>
                    </div>
                    <div className="item-actions">
                      <button 
                        onClick={() => startEditFaculty(f)}
                        className="edit-btn"
                      >
                        ✏ Edit
                      </button>
                      <button 
                        onClick={() => deleteFaculty(f.id)}
                        className="delete-btn"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case "courses":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-icon">📚</div>
              <h2 className="card-title">Manage Courses</h2>
            </div>
            
            <form onSubmit={editingCourseId ? (e) => { e.preventDefault(); saveCourse(); } : addCourse} className="modern-form">
              <div className="form-group">
                <label className="form-label">Select Faculty</label>
                <select
                  className="form-select"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  {editingCourseId ? "Course Name" : "New Course Name"}
                </label>
                <input
                  className="form-input"
                  placeholder="Course Name"
                  value={editingCourseId ? editingCourseName : newCourse}
                  onChange={(e) => {
                    if (editingCourseId) setEditingCourseName(e.target.value);
                    else setNewCourse(e.target.value);
                  }}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Minimum GPA</label>
                <input
                  className="form-input"
                  placeholder="Minimum GPA (default: 2.5)"
                  value={minGPA}
                  onChange={(e) => setMinGPA(e.target.value)}
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                />
              </div>
              
              <div className="form-actions">
                {editingCourseId ? (
                  <>
                    <button 
                      type="button" 
                      onClick={saveCourse} 
                      className="submit-btn"
                      disabled={loading}
                    >
                      Save Course
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingCourseId(null);
                        setEditingCourseName("");
                        setMinGPA("");
                        setSelectedFaculty("");
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="submit" className="submit-btn" disabled={loading}>
                    Add Course
                  </button>
                )}
              </div>
            </form>
            
            <div className="list-items">
              {courses.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-icon">📚</div>
                  <h3>No Courses Yet</h3>
                  <p>Add courses to your faculties to attract students.</p>
                </div>
              ) : (
                courses.map((c) => (
                  <div className="list-item" key={c.id}>
                    <div className="item-content">
                      <h4>{c.name}</h4>
                      <p>
                        Faculty: {c.facultyName || "Unknown"} • 
                        Minimum GPA: {c.minGPA} • 
                        Created: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="item-actions">
                      <button 
                        onClick={() => startEditCourse(c)}
                        className="edit-btn"
                      >
                        ✏ Edit
                      </button>
                      <button 
                        onClick={() => deleteCourse(c.id)}
                        className="delete-btn"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case "applications":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <UsersIcon />
              <h2 className="card-title">Student Applications</h2>
            </div>
            
            {applications.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">🎓</div>
                <h3>No Applications Yet</h3>
                <p>Student applications will appear here once they apply to your courses.</p>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">{applications.length}</div>
                    <div className="stat-label">Total Applications</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {applications.filter(a => a.status === "Admitted").length}
                    </div>
                    <div className="stat-label">Admitted</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {applications.filter(a => a.status === "Rejected").length}
                    </div>
                    <div className="stat-label">Rejected</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {applications.filter(a => !a.status || a.status === "Pending").length}
                    </div>
                    <div className="stat-label">Pending Review</div>
                  </div>
                </div>
                
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Courses Applied</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <strong>{app.studentName}</strong>
                          <br />
                          <small style={{ color: '#8888aa' }}>ID: {app.studentId?.substring(0, 8)}</small>
                        </td>
                        <td>
                          {Array.isArray(app.courses) ? app.courses.join(", ") : app.courses}
                        </td>
                        <td>{app.date ? new Date(app.date).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <span className={`status-badge status-${(app.status || "pending").toLowerCase()}`}>
                            {app.status || "Pending"}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              onClick={() => updateApplicationStatus(app.id, "Admitted")}
                              className="admit-btn"
                              disabled={app.status === "Admitted"}
                            >
                              Admit
                            </button>
                            <button 
                              onClick={() => updateApplicationStatus(app.id, "Rejected")}
                              className="reject-btn"
                              disabled={app.status === "Rejected"}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                  <button 
                    onClick={publishAdmissions}
                    className="cta-button"
                    disabled={loading || applications.filter(a => a.status === "Admitted").length === 0}
                  >
                    📢 Publish Admissions
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case "dashboard":
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <>
      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setActiveSection("faculties")}>
          <div className="stat-number">{faculties.length}</div>
          <div className="stat-label">Faculties</div>
        </div>
        <div className="stat-card" onClick={() => setActiveSection("courses")}>
          <div className="stat-number">{courses.length}</div>
          <div className="stat-label">Courses</div>
        </div>
        <div className="stat-card" onClick={() => setActiveSection("applications")}>
          <div className="stat-number">{applications.length}</div>
          <div className="stat-label">Applications</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {applications.filter(a => a.status === "Admitted").length}
          </div>
          <div className="stat-label">Admitted</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-icon">⚡</div>
          <h2 className="card-title">Quick Actions</h2>
        </div>
        
        <div className="quick-actions">
          <div className="action-card" onClick={() => setActiveSection("profile")}>
            <div className="action-icon">🏢</div>
            <h3 className="action-label">Update Profile</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("faculties")}>
            <div className="action-icon">📘</div>
            <h3 className="action-label">Manage Faculties</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("courses")}>
            <div className="action-icon">📚</div>
            <h3 className="action-label">Manage Courses</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("applications")}>
            <div className="action-icon">🎓</div>
            <h3 className="action-label">Review Applications</h3>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      {applications.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <ChartIcon />
            <h2 className="card-title">Recent Applications</h2>
          </div>
          
          <div className="list-items">
            {applications.slice(0, 5).map((app) => (
              <div className="list-item" key={app.id}>
                <div className="item-content">
                  <h4>{app.studentName}</h4>
                  <p>
                    Applied to: {Array.isArray(app.courses) ? app.courses.slice(0, 2).join(", ") : app.courses}
                    {Array.isArray(app.courses) && app.courses.length > 2 ? "..." : ""}
                  </p>
                  <small style={{ color: '#8888aa' }}>
                    Submitted: {app.date ? new Date(app.date).toLocaleDateString() : "N/A"}
                  </small>
                </div>
                <div>
                  <span className={`status-badge status-${(app.status || "pending").toLowerCase()}`}>
                    {app.status || "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {applications.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button 
                className="cta-button"
                onClick={() => setActiveSection("applications")}
                style={{ padding: '12px 24px' }}
              >
                View All {applications.length} Applications →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Courses */}
      {courses.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon">📚</div>
            <h2 className="card-title">Recent Courses</h2>
          </div>
          
          <div className="list-items">
            {courses.slice(0, 5).map((c) => (
              <div className="list-item" key={c.id}>
                <div className="item-content">
                  <h4>{c.name}</h4>
                  <p>
                    Faculty: {c.facultyName || "Unknown"} • 
                    Minimum GPA: {c.minGPA}
                  </p>
                  <small style={{ color: '#8888aa' }}>
                    Created: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A"}
                  </small>
                </div>
              </div>
            ))}
          </div>
          
          {courses.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button 
                className="header-btn"
                onClick={() => setActiveSection("courses")}
                style={{ width: 'auto', margin: '0 auto' }}
              >
                View All {courses.length} Courses →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="institution-page">
      {/* Modern Sidebar */}
      <div className="institution-sidebar">
        <div className="institution-logo">
          <h2>🎓 Institution</h2>
        </div>
        
        <nav className="institution-nav">
          <ul>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveSection("dashboard")}
              >
                <HomeIcon /> Dashboard
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "profile" ? "active" : ""}`}
                onClick={() => setActiveSection("profile")}
              >
                <ProfileIcon /> Profile
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "faculties" ? "active" : ""}`}
                onClick={() => setActiveSection("faculties")}
              >
                <FacultyIcon /> Faculties
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "courses" ? "active" : ""}`}
                onClick={() => setActiveSection("courses")}
              >
                <CourseIcon /> Courses
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "applications" ? "active" : ""}`}
                onClick={() => setActiveSection("applications")}
              >
                <ApplicationsIcon /> Applications
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
      <div className="institution-content">
        <div className="content-header">
          <h1>
            Welcome to{" "}
            <span style={{ background: 'linear-gradient(135deg, #7a5cff, #5a3dcc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {institution?.name || "Institution"}
            </span>
          </h1>
          <div className="header-actions">
            <button 
              className="header-btn"
              onClick={() => {
                loadFaculties(institution.id);
                loadCourses(institution.id);
                loadApplications(institution.name);
              }}
            >
              🔄 Refresh
            </button>
            <button 
              className="header-btn primary"
              onClick={publishAdmissions}
              disabled={applications.length === 0}
            >
              📢 Publish Admissions
            </button>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}