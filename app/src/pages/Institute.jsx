import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
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

export default function InstitutionDashboard() {
  const [institution, setInstitution] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({});
  const [newFaculty, setNewFaculty] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [minGPA, setMinGPA] = useState("");

  // 🔹 Load institution on mount
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

  // 🔹 Load institution profile
  const loadInstitution = async (uid) => {
    try {
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
    }
  };

  // 🔹 Faculties
  const loadFaculties = async (institutionId) => {
    const q = query(collection(db, "faculties"), where("institutionId", "==", institutionId));
    const snap = await getDocs(q);
    setFaculties(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const addFaculty = async (e) => {
    e.preventDefault();
    try {
      if (!newFaculty.trim() || !institution) return;
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
    }
  };

  const deleteFaculty = async (id) => {
    await deleteDoc(doc(db, "faculties", id));
    await loadFaculties(institution.id);
  };

  // 🔹 Courses
  const loadCourses = async (institutionId) => {
    const q = query(collection(db, "courses"), where("institutionId", "==", institutionId));
    const snap = await getDocs(q);
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const addCourse = async (e) => {
    e.preventDefault();
    try {
      if (!newCourse.trim() || !selectedFaculty || !institution) {
        alert("Please fill all fields!");
        return;
      }
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
    }
  };

  const deleteCourse = async (id) => {
    await deleteDoc(doc(db, "courses", id));
    await loadCourses(institution.id);
  };

  // 🔹 Applications
  const loadApplications = async (institutionName) => {
    const q = query(collection(db, "applications"), where("institution", "==", institutionName));
    const snap = await getDocs(q);
    setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const updateApplicationStatus = async (id, status) => {
    const ref = doc(db, "applications", id);
    await updateDoc(ref, { status });
    await loadApplications(institution.name);
  };

  // 🔹 Publish admissions
  const publishAdmissions = async () => {
    try {
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
    } catch (err) {
      alert("❌ Error publishing admissions: " + err.message);
    }
  };

  // 🔹 Update profile
  const updateProfile = async (e) => {
    e.preventDefault();
    if (!institution) return;

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
    await loadInstitution(institution.id); // reload after update
    alert("✅ Profile updated successfully!");
  };

  if (!institution) return <p>Loading Institution Dashboard...</p>;

  return (
    <div className="institute-page">
      <Navbar title="Institution Dashboard" />
      <div className="institute-content">
        <h2>🏫 Welcome, {institution.name || "Institution"}!</h2>

        {/* PROFILE */}
        <section>
          <h3>🏢 Institution Profile</h3>
          <form onSubmit={updateProfile} className="form-section">
            <input
              placeholder="Institution Name"
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <input
              placeholder="Location"
              value={profile.location || ""}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            />
            <textarea
              placeholder="About the Institution"
              value={profile.about || ""}
              onChange={(e) => setProfile({ ...profile, about: e.target.value })}
            />
            <button type="submit">Update Profile</button>
          </form>
        </section>

        {/* FACULTIES */}
        <section>
          <h3>📘 Manage Faculties</h3>
          <form onSubmit={addFaculty} className="form-section">
            <input
              placeholder="Faculty Name"
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
            />
            <button>Add Faculty</button>
          </form>
          <ul>
            {faculties.map((f) => (
              <li key={f.id}>
                {f.name}{" "}
                <button onClick={() => deleteFaculty(f.id)}>🗑</button>
              </li>
            ))}
          </ul>
        </section>

        {/* COURSES */}
        <section>
          <h3>📚 Manage Courses</h3>
          <form onSubmit={addCourse} className="form-section">
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
            >
              <option value="">Select Faculty</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
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
                {c.name} — GPA ≥ {c.minGPA}{" "}
                <button onClick={() => deleteCourse(c.id)}>🗑</button>
              </li>
            ))}
          </ul>
        </section>

        {/* APPLICATIONS */}
        <section>
          <h3>🎓 Student Applications</h3>
          {applications.length === 0 ? (
            <p>No applications yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Courses</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>{app.studentName}</td>
                    <td>{Array.isArray(app.courses) ? app.courses.join(", ") : app.courses}</td>
                    <td>{app.status}</td>
                    <td>
                      <button onClick={() => updateApplicationStatus(app.id, "Admitted")}>
                        Admit
                      </button>
                      <button onClick={() => updateApplicationStatus(app.id, "Rejected")}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ADMISSIONS */}
        <section>
          <h3>📢 Publish Admissions</h3>
          <button onClick={publishAdmissions}>Publish</button>
        </section>
      </div>
    </div>
  );
}
