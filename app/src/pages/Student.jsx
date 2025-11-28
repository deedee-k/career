import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { auth, db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendEmailVerification } from "firebase/auth";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedCourses, setSelectedCourses] = useState([]);

  // ✅ Load logged-in user and data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        if (!u.emailVerified) {
          await sendEmailVerification(u);
          alert("📩 Verification email sent! Please verify before applying.");
        }
        await initData(u.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const initData = async (uid) => {
    await Promise.all([
      loadProfile(uid),
      loadInstitutions(),
      loadCourses(),
      loadApplications(uid),
      loadAdmissions(uid),
      loadJobs(),
    ]);
  };

  // 🔹 Loaders
  const loadProfile = async (uid) => {
    const refUser = doc(db, "users", uid);
    const snap = await getDoc(refUser);
    if (snap.exists()) {
      setProfile(snap.data());
    } else {
      const newProfile = {
        uid,
        email: auth.currentUser.email,
        role: "student",
        createdAt: new Date().toISOString(),
        experienceYears: 0, // NEW
      };
      await setDoc(refUser, newProfile);
      setProfile(newProfile);
    }
  };

  const loadInstitutions = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.role === "institution");
    setInstitutions(list);
  };

  const loadCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadApplications = async (uid) => {
    const q = query(collection(db, "applications"), where("studentId", "==", uid));
    const snap = await getDocs(q);
    setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadAdmissions = async (uid) => {
    const q = query(collection(db, "admissions"), where("studentId", "==", uid));
    const snap = await getDocs(q);
    setAdmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadJobs = async () => {
    const snap = await getDocs(collection(db, "jobs"));
    setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // 🔹 Update profile
  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const refUser = doc(db, "users", user.uid);
      await updateDoc(refUser, profile);
      alert("✅ Profile updated!");
    } catch (err) {
      alert("❌ Failed to update profile: " + err.message);
    }
  };

  // 🔹 Upload document (transcript / certificates)
  const uploadFile = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileRef = ref(storage, `students/${user.uid}/${field}-${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "users", user.uid), { [`${field}URL`]: url });
      setProfile({ ...profile, [`${field}URL`]: url });
      alert(`📎 ${field} uploaded successfully!`);
    } catch (err) {
      alert("❌ Upload failed: " + err.message);
    }
  };

  // 🔹 Apply for courses (max 2 per institution)
  const applyForCourses = async (e) => {
    e.preventDefault();

    if (!selectedInstitution || selectedCourses.length === 0) {
      alert("Please select an institution and at least one course.");
      return;
    }

    if (selectedCourses.length > 2) {
      alert("⚠️ You can only apply for up to 2 courses per institution.");
      return;
    }

    const alreadyApplied = applications.some(
      (a) => a.institution === selectedInstitution
    );
    if (alreadyApplied) {
      alert("❌ You already applied to this institution.");
      return;
    }

    // GPA Check
    for (const courseName of selectedCourses) {
      const course = courses.find((c) => c.name === courseName);
      const minGPA = parseFloat(course?.minGPA || 2.5);
      const studentGPA = parseFloat(profile.gpa || 0);
      if (studentGPA < minGPA) {
        alert(`❌ You don't qualify for ${courseName} (Min GPA: ${minGPA})`);
        return;
      }
    }

    // ✅ Save the course application correctly
    await addDoc(collection(db, "applications"), {
      studentId: user.uid,
      studentName: profile.name || user.email,
      institution: selectedInstitution,
      courses: selectedCourses,
      status: "Pending",
      date: new Date().toISOString(),
    });

    alert("✅ Application submitted!");
    setSelectedCourses([]);
    await loadApplications(user.uid);
  };

  // 🔹 Confirm admission (choose 1 institution)
  const confirmAdmission = async (chosen) => {
    const others = admissions.filter((a) => a.id !== chosen.id);
    for (const a of others) {
      await deleteDoc(doc(db, "admissions", a.id));
    }
    alert(`🎓 You confirmed admission at ${chosen.institution}`);
    await loadAdmissions(user.uid);
  };

  // Prevent render crash while loading
  if (!user) return <p>Loading student dashboard...</p>;

  return (
    <div className="student-page">
      <Navbar title="Student Dashboard" />
      <div className="student-content">
        <h2>🎓 Welcome, {profile.name || user.email}</h2>

        {/* PROFILE SECTION */}
        <section>
          <h3>👤 Profile</h3>
          <form onSubmit={updateProfile} className="form-section">
            <input
              placeholder="Full Name"
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <input
              placeholder="GPA"
              value={profile.gpa || ""}
              onChange={(e) => setProfile({ ...profile, gpa: e.target.value })}
            />
            <input
              placeholder="Skills (comma separated)"
              value={profile.skills || ""}
              onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
            />
            <input
              placeholder="Work Experience (years)"
              type="number"
              min="0"
              value={profile.experienceYears || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  experienceYears: parseFloat(e.target.value),
                })
              }
            />
            <button>Update</button>
          </form>

          <div className="upload-section">
            <label>Upload Transcript:</label>
            <input type="file" onChange={(e) => uploadFile(e, "transcript")} />
            <label>Upload Certificates:</label>
            <input type="file" onChange={(e) => uploadFile(e, "certificates")} />
          </div>
        </section>

        {/* APPLY FOR COURSES */}
        <section>
          <h3>📘 Apply for Courses</h3>

          <form onSubmit={applyForCourses} className="form-section">
            <select
              value={selectedInstitution}
              onChange={(e) => {
                setSelectedInstitution(e.target.value);
                setSelectedCourses([]); // reset selected courses
              }}
              required
            >
              <option value="">Select Institution</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.name}>
                  {i.name}
                </option>
              ))}
            </select>

            <div className="course-card-container">
              {courses
                .filter((c) => c.institutionName === selectedInstitution)
                .map((c) => {
                  const selected = selectedCourses.includes(c.name);
                  return (
                    <div
                      key={c.id}
                      className={`course-card ${selected ? "selected" : ""}`}
                      onClick={() => {
                        if (selected) {
                          setSelectedCourses(selectedCourses.filter((x) => x !== c.name));
                        } else {
                          setSelectedCourses([...selectedCourses, c.name]);
                        }
                      }}
                    >
                      <h4>{c.name}</h4>
                      <p className="gpa">Min GPA: {c.minGPA || 2.5}</p>
                      {c.description && <p className="desc">{c.description}</p>}
                    </div>
                  );
                })}
            </div>

            <button>Apply</button>
          </form>

          <ul className="course-app-list">
            {applications.map((a) => (
              <li key={a.id}>
                <b>{a.institution}</b> —{" "}
                {Array.isArray(a.courses) ? a.courses.join(", ") : a.courses} |{" "}
                <span>{a.status}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ADMISSIONS */}
        <section>
          <h3>🎓 Admissions</h3>
          {admissions.length === 0 ? (
            <p>No admissions yet.</p>
          ) : (
            <ul>
              {admissions.map((a) => (
                <li key={a.id}>
                  Admitted at <b>{a.institution}</b> —{" "}
                  {Array.isArray(a.courses) ? a.courses.join(", ") : a.courses}
                  <button onClick={() => confirmAdmission(a)}>Confirm</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* JOBS */}
        <section>
          <h3>💼 Job Opportunities</h3>

          {jobs.length === 0 ? (
            <p>No job postings yet.</p>
          ) : (
            <ul className="job-list">
              {jobs.map((job) => {
                const qualifies =
                  parseFloat(profile.gpa || 0) >= (job.minGPA || 2.5) &&
                  (profile.experienceYears || 0) >= (job.minExperience || 0) &&
                  (!job.requiredSkills ||
                    job.requiredSkills.some((skill) =>
                      (profile.skills || "")
                        .toLowerCase()
                        .includes(skill.toLowerCase())
                    ));

                return (
                  <li key={job.id} className="job-card">
                    <b className="job-title">{job.title}</b> at {job.companyName}
                    <br />
                    <i className="job-desc">{job.description}</i>

                    <div className="qual-box">
                      <h4>Qualifications</h4>
                      <p>
                        <span className="label">Min GPA:</span>{" "}
                        <span className="value">{job.minGPA || 2.5}</span>
                      </p>
                      <p>
                        <span className="label">Min Experience:</span>{" "}
                        <span className="value">{job.minExperience || 0} years</span>
                      </p>

                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="skill-list">
                          {job.requiredSkills.map((skill, idx) => (
                            <span key={idx} className="skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {qualifies ? (
                      <button
                        onClick={async () => {
                          await addDoc(collection(db, "jobApplications"), {
                            jobId: job.id,
                            studentId: user.uid,
                            studentName: profile.name || user.email,
                            status: "Applied",
                            date: new Date().toISOString(),
                          });
                          alert("✅ Applied successfully!");
                        }}
                      >
                        Apply
                      </button>
                    ) : (
                      <span className="not-qualified">❌ Not qualified</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
