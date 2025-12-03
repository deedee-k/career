import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
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


// Icons
const HomeIcon = () => <span className="nav-icon">🏠</span>;
const ProfileIcon = () => <span className="nav-icon">👤</span>;
const ApplyIcon = () => <span className="nav-icon">📘</span>;
const AdmissionsIcon = () => <span className="nav-icon">🎓</span>;
const JobsIcon = () => <span className="nav-icon">💼</span>;
const LogoutIcon = () => <span>🚪</span>;
const UserIcon = () => <span className="card-icon">👤</span>;
const BookIcon = () => <span className="card-icon">📚</span>;
const GraduationIcon = () => <span className="card-icon">🎓</span>;
const BriefcaseIcon = () => <span className="card-icon">💼</span>;

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedCourses, setSelectedCourses] = useState([]);

  const navigate = useNavigate();

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
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(uid),
        loadInstitutions(),
        loadCourses(),
        loadApplications(uid),
        loadAdmissions(uid),
        loadJobs(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
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
        experienceYears: 0,
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
      setLoading(true);
      const refUser = doc(db, "users", user.uid);
      await updateDoc(refUser, profile);
      alert("✅ Profile updated!");
    } catch (err) {
      alert("❌ Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Upload document
  const uploadFile = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileRef = ref(storage, `students/${user.uid}/${field}-${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "users", user.uid), { [`${field}URL`]: url });
      setProfile({ ...profile, [`${field}URL`]: url });
      alert(`📎 ${field} uploaded successfully!`);
    } catch (err) {
      alert("❌ Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Apply for courses
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

    try {
      setLoading(true);
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
      setSelectedInstitution("");
      await loadApplications(user.uid);
      setActiveSection("applications");
    } catch (err) {
      alert("❌ Failed to submit application: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Confirm admission
  const confirmAdmission = async (chosen) => {
    if (!window.confirm(`Are you sure you want to confirm admission at ${chosen.institution}? This will decline all other offers.`)) {
      return;
    }

    try {
      setLoading(true);
      const others = admissions.filter((a) => a.id !== chosen.id);
      for (const a of others) {
        await deleteDoc(doc(db, "admissions", a.id));
      }
      alert(`🎓 You confirmed admission at ${chosen.institution}`);
      await loadAdmissions(user.uid);
    } catch (err) {
      alert("❌ Failed to confirm admission: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Apply for job
  const applyForJob = async (job) => {
    try {
      setLoading(true);
      await addDoc(collection(db, "jobApplications"), {
        jobId: job.id,
        studentId: user.uid,
        studentName: profile.name || user.email,
        studentGPA: profile.gpa || 0,
        experienceYears: profile.experienceYears || 0,
        skills: profile.skills || "",
        status: "Applied",
        date: new Date().toISOString(),
      });
      alert("✅ Applied successfully!");
    } catch (err) {
      alert("❌ Failed to apply: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Check job qualification
  const checkJobQualification = (job) => {
    const gpa = parseFloat(profile.gpa || 0);
    const experience = parseFloat(profile.experienceYears || 0);
    const skills = (profile.skills || "").toLowerCase();
    
    const qualifiesGPA = gpa >= (job.minGPA || 2.5);
    const qualifiesExp = experience >= (job.minExperience || 0);
    const qualifiesSkills = !job.requiredSkills || 
      job.requiredSkills.some(skill => skills.includes(skill.toLowerCase()));
    
    return qualifiesGPA && qualifiesExp && qualifiesSkills;
  };

  // 🔹 Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    }
  };

  // 🔹 Render content based on active section
  const renderContent = () => {
    if (!user) {
      return (
        <div className="loading-state">
          <div>Loading Student Dashboard...</div>
        </div>
      );
    }

    if (loading && activeSection === "dashboard") {
      return (
        <div className="loading-state">
          <div>Loading dashboard data...</div>
        </div>
      );
    }

    switch (activeSection) {
      case "profile":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <UserIcon />
              <h2 className="card-title">Student Profile</h2>
            </div>
            
            <form onSubmit={updateProfile} className="modern-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="Enter your full name"
                  value={profile.name || ""}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">GPA (0.0 - 4.0)</label>
                <input
                  className="form-input"
                  placeholder="3.5"
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={profile.gpa || ""}
                  onChange={(e) => setProfile({ ...profile, gpa: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Work Experience (years)</label>
                <input
                  className="form-input"
                  placeholder="2"
                  type="number"
                  min="0"
                  value={profile.experienceYears || ""}
                  onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })}
                />
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">Skills (comma separated)</label>
                <input
                  className="form-input"
                  placeholder="e.g., JavaScript, React, Python, Leadership"
                  value={profile.skills || ""}
                  onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  Update Profile
                </button>
              </div>
            </form>
            
            <div className="upload-section">
              <label className="upload-label">Upload Transcript (PDF)</label>
              <input 
                type="file" 
                className="upload-input"
                accept=".pdf,.doc,.docx"
                onChange={(e) => uploadFile(e, "transcript")}
              />
              
              <label className="upload-label">Upload Certificates (PDF/Image)</label>
              <input 
                type="file" 
                className="upload-input"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => uploadFile(e, "certificates")}
              />
            </div>
          </div>
        );

      case "apply":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <BookIcon />
              <h2 className="card-title">Apply for Courses</h2>
            </div>
            
            <form onSubmit={applyForCourses} className="modern-form">
              <div className="form-group full-width">
                <label className="form-label">Select Institution</label>
                <select
                  className="form-select"
                  value={selectedInstitution}
                  onChange={(e) => {
                    setSelectedInstitution(e.target.value);
                    setSelectedCourses([]);
                  }}
                  required
                >
                  <option value="">Select an institution</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">
                  Select Courses (Max 2 per institution)
                </label>
                
                <div className="courses-grid">
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
                              if (selectedCourses.length < 2) {
                                setSelectedCourses([...selectedCourses, c.name]);
                              } else {
                                alert("⚠️ You can only select up to 2 courses per institution.");
                              }
                            }
                          }}
                        >
                          <h4>{c.name}</h4>
                          <div className="gpa-tag">Min GPA: {c.minGPA || 2.5}</div>
                          {c.description && (
                            <p className="course-desc">{c.description}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={loading || selectedCourses.length === 0}
                >
                  📘 Submit Application
                </button>
              </div>
            </form>
          </div>
        );

      case "applications":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <BookIcon />
              <h2 className="card-title">My Applications</h2>
            </div>
            
            {applications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Applications Yet</h3>
                <p>You haven't applied to any courses yet. Start your journey by applying to courses!</p>
                <button 
                  className="cta-button"
                  onClick={() => setActiveSection("apply")}
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="applications-list">
                {applications.map((a) => (
                  <div className="application-item" key={a.id}>
                    <div className="app-info">
                      <h4>{a.institution}</h4>
                      <p>
                        Courses: {Array.isArray(a.courses) ? a.courses.join(", ") : a.courses}
                      </p>
                      <small>Applied: {a.date ? new Date(a.date).toLocaleDateString() : "N/A"}</small>
                    </div>
                    <span className={`status-badge status-${(a.status || "pending").toLowerCase()}`}>
                      {a.status || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "admissions":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <GraduationIcon />
              <h2 className="card-title">Admission Offers</h2>
            </div>
            
            {admissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎓</div>
                <h3>No Admission Offers Yet</h3>
                <p>You'll see admission offers here once institutions review your applications.</p>
              </div>
            ) : (
              <>
                <div className="admissions-grid">
                  {admissions.map((a) => (
                    <div className="admission-card" key={a.id}>
                      <h4>🎉 Congratulations!</h4>
                      <p>You've been admitted to:</p>
                      <h3 style={{ color: '#00c9a7', margin: '15px 0' }}>{a.institution}</h3>
                      
                      <div className="admission-courses">
                        <p><strong>Courses Offered:</strong></p>
                        {Array.isArray(a.courses) ? (
                          a.courses.map((course, idx) => (
                            <p key={idx}>✓ {course}</p>
                          ))
                        ) : (
                          <p>✓ {a.courses}</p>
                        )}
                      </div>
                      
                      <button 
                        className="confirm-btn"
                        onClick={() => confirmAdmission(a)}
                        disabled={loading}
                      >
                        🎓 Confirm Admission
                      </button>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(0, 201, 167, 0.1)', borderRadius: '12px' }}>
                  <p style={{ color: '#a0a0c0', margin: 0 }}>
                    <strong>Note:</strong> You can only accept one admission offer. Accepting an offer will automatically decline all other offers.
                  </p>
                </div>
              </>
            )}
          </div>
        );

      case "jobs":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <BriefcaseIcon />
              <h2 className="card-title">Job Opportunities</h2>
            </div>
            
            {jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <h3>No Job Postings Available</h3>
                <p>Companies haven't posted any job opportunities yet. Check back later!</p>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">{jobs.length}</div>
                    <div className="stat-label">Total Jobs</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {jobs.filter(job => checkJobQualification(job)).length}
                    </div>
                    <div className="stat-label">You Qualify For</div>
                  </div>
                </div>
                
                <div className="jobs-grid">
                  {jobs.map((job) => {
                    const qualifies = checkJobQualification(job);
                    
                    return (
                      <div className="job-card" key={job.id}>
                        <h3 className="job-title">{job.title}</h3>
                        <span className="job-company">🏢 {job.companyName}</span>
                        
                        <p className="job-description">{job.description}</p>
                        
                        <div className="qualifications">
                          <p>
                            <span className="qual-label">Minimum GPA:</span>
                            <span className="qual-value">{job.minGPA || 2.5}</span>
                          </p>
                          <p>
                            <span className="qual-label">Experience Required:</span>
                            <span className="qual-value">{job.minExperience || 0} years</span>
                          </p>
                          
                          {job.requiredSkills && job.requiredSkills.length > 0 && (
                            <>
                              <p style={{ marginTop: '15px', marginBottom: '10px' }}>
                                <span className="qual-label">Required Skills:</span>
                              </p>
                              <div className="skills-list">
                                {job.requiredSkills.map((skill, idx) => (
                                  <span key={idx} className="skill-tag">{skill}</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="job-actions">
                          {qualifies ? (
                            <button 
                              className="apply-btn"
                              onClick={() => applyForJob(job)}
                              disabled={loading}
                            >
                              Apply Now
                            </button>
                          ) : (
                            <span className="not-qualified">
                              ❌ You don't meet the requirements
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
        <div className="stat-card" onClick={() => setActiveSection("applications")}>
          <div className="stat-number">{applications.length}</div>
          <div className="stat-label">Applications</div>
        </div>
        <div className="stat-card" onClick={() => setActiveSection("admissions")}>
          <div className="stat-number">{admissions.length}</div>
          <div className="stat-label">Admissions</div>
        </div>
        <div className="stat-card" onClick={() => setActiveSection("jobs")}>
          <div className="stat-number">{jobs.length}</div>
          <div className="stat-label">Jobs Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {profile.gpa ? parseFloat(profile.gpa).toFixed(1) : "N/A"}
          </div>
          <div className="stat-label">Your GPA</div>
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
            <div className="action-icon">👤</div>
            <h3 className="action-label">Update Profile</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("apply")}>
            <div className="action-icon">📘</div>
            <h3 className="action-label">Apply to Courses</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("applications")}>
            <div className="action-icon">📋</div>
            <h3 className="action-label">View Applications</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("jobs")}>
            <div className="action-icon">💼</div>
            <h3 className="action-label">Browse Jobs</h3>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      {applications.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon">📋</div>
            <h2 className="card-title">Recent Applications</h2>
          </div>
          
          <div className="applications-list">
            {applications.slice(0, 3).map((a) => (
              <div className="application-item" key={a.id}>
                <div className="app-info">
                  <h4>{a.institution}</h4>
                  <p>
                    {Array.isArray(a.courses) ? a.courses.slice(0, 2).join(", ") : a.courses}
                    {Array.isArray(a.courses) && a.courses.length > 2 ? "..." : ""}
                  </p>
                  <small>Applied: {a.date ? new Date(a.date).toLocaleDateString() : "N/A"}</small>
                </div>
                <span className={`status-badge status-${(a.status || "pending").toLowerCase()}`}>
                  {a.status || "Pending"}
                </span>
              </div>
            ))}
          </div>
          
          {applications.length > 3 && (
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

      {/* Recent Admissions */}
      {admissions.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon">🎓</div>
            <h2 className="card-title">Admission Offers</h2>
          </div>
          
          <div className="admissions-grid">
            {admissions.slice(0, 2).map((a) => (
              <div className="admission-card" key={a.id}>
                <h3 style={{ color: '#00c9a7' }}>{a.institution}</h3>
                <p>Congratulations! You've been admitted.</p>
                <button 
                  className="confirm-btn"
                  onClick={() => confirmAdmission(a)}
                  style={{ marginTop: '15px' }}
                >
                  Confirm Admission
                </button>
              </div>
            ))}
          </div>
          
          {admissions.length > 2 && (
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button 
                className="cta-button"
                onClick={() => setActiveSection("admissions")}
                style={{ padding: '12px 24px' }}
              >
                View All {admissions.length} Offers →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Featured Jobs */}
      {jobs.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon">💼</div>
            <h2 className="card-title">Featured Jobs</h2>
          </div>
          
          <div className="jobs-grid">
            {jobs.slice(0, 2).map((job) => {
              const qualifies = checkJobQualification(job);
              
              return (
                <div className="job-card" key={job.id}>
                  <h3 className="job-title">{job.title}</h3>
                  <span className="job-company">🏢 {job.companyName}</span>
                  
                  <div className="job-actions">
                    {qualifies ? (
                      <button 
                        className="apply-btn"
                        onClick={() => applyForJob(job)}
                        style={{ width: '100%' }}
                      >
                        Apply Now
                      </button>
                    ) : (
                      <span className="not-qualified" style={{ width: '100%', textAlign: 'center' }}>
                        ❌ Requirements not met
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {jobs.length > 2 && (
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button 
                className="cta-button"
                onClick={() => setActiveSection("jobs")}
                style={{ padding: '12px 24px' }}
              >
                Browse All {jobs.length} Jobs →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="student-page">
      {/* Modern Sidebar */}
      <div className="student-sidebar">
        <div className="student-logo">
          <h2>🎓 Students</h2>
        </div>
        
        <nav className="student-nav">
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
                className={`nav-item ${activeSection === "apply" ? "active" : ""}`}
                onClick={() => setActiveSection("apply")}
              >
                <ApplyIcon /> Apply to Courses
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "applications" ? "active" : ""}`}
                onClick={() => setActiveSection("applications")}
              >
                <ApplyIcon /> My Applications
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "admissions" ? "active" : ""}`}
                onClick={() => setActiveSection("admissions")}
              >
                <AdmissionsIcon /> Admissions
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "jobs" ? "active" : ""}`}
                onClick={() => setActiveSection("jobs")}
              >
                <JobsIcon /> Jobs
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
      <div className="student-content">
        <div className="content-header">
          <h1>
            Welcome back,{" "}
            <span style={{ background: 'linear-gradient(135deg, #00c9a7, #00a98e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {profile.name || "Student"}
            </span>
          </h1>
          <div className="student-stats">
            <span className="stat-pill">🎓 GPA: {profile.gpa || "N/A"}</span>
            <span className="stat-pill">📋 {applications.length} Applications</span>
            <span className="stat-pill">💼 {jobs.length} Jobs</span>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}