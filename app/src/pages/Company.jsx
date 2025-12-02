import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import "../styles/Company.css";

// Icons
const HomeIcon = () => <span className="nav-icon">🏠</span>;
const JobIcon = () => <span className="nav-icon">💼</span>;
const ApplicantsIcon = () => <span className="nav-icon">👥</span>;
const ProfileIcon = () => <span className="nav-icon">⚙️</span>;
const LogoutIcon = () => <span>🚪</span>;
const PlusIcon = () => <span>➕</span>;
const BriefcaseIcon = () => <span className="card-icon">💼</span>;
const UsersIcon = () => <span className="card-icon">👥</span>;
const ChartIcon = () => <span className="card-icon">📊</span>;
const SettingsIcon = () => <span className="card-icon">⚙️</span>;

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    minGPA: "",
    minExperience: "",
    requiredSkills: "",
    location: "",
    salary: "",
    jobType: "Full-time"
  });

  const navigate = useNavigate();

  // ------------------ LOAD COMPANY ------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await loadCompany(user.uid);
      }
    });
    return () => unsub();
  }, []);

  const loadCompany = async (uid) => {
    setLoading(true);
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = { id: uid, ...snap.data() };
        setCompany(data);
        await loadJobsAndApplicants(uid);
      } else {
        alert("⚠️ Company data missing");
      }
    } catch (error) {
      console.error("Error loading company:", error);
      alert("Error loading company data");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ LOAD JOBS + APPLICANTS ------------------
  const loadJobsAndApplicants = async (companyId) => {
    try {
      // Load company's jobs
      const q = query(collection(db, "jobs"), where("companyId", "==", companyId));
      const jobsSnap = await getDocs(q);
      const jobList = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setJobs(jobList);

      // Load all applications
      const appsSnap = await getDocs(collection(db, "jobApplications"));
      const allApps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Filter applications for this company's jobs
      const companyApps = allApps.filter((a) => 
        jobList.some((j) => j.id === a.jobId)
      );
      setApplicants(companyApps);
    } catch (error) {
      console.error("Error loading jobs/applicants:", error);
      alert("Error loading job data");
    }
  };

  // ------------------ HANDLE LOGOUT ------------------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    }
  };

  // ------------------ POST JOB ------------------
  const postJob = async (e) => {
    e.preventDefault();
    if (!company) return;

    try {
      const jobData = {
        ...newJob,
        companyId: company.id,
        companyName: company.name || company.email,
        minGPA: parseFloat(newJob.minGPA) || 2.5,
        minExperience: parseFloat(newJob.minExperience) || 0,
        salary: newJob.salary || "Not specified",
        location: newJob.location || "Remote",
        requiredSkills: newJob.requiredSkills
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(s => s.length > 0),
        createdAt: new Date().toISOString(),
        status: "active"
      };

      await addDoc(collection(db, "jobs"), jobData);
      setNewJob({ 
        title: "", 
        description: "", 
        minGPA: "", 
        minExperience: "", 
        requiredSkills: "",
        location: "",
        salary: "",
        jobType: "Full-time"
      });
      
      await loadJobsAndApplicants(company.id);
      setActiveSection("jobs");
      alert("🎉 Job posted successfully!");
    } catch (error) {
      console.error("Error posting job:", error);
      alert("Error posting job. Please try again.");
    }
  };

  // ------------------ UPDATE APPLICATION STATUS ------------------
  const updateStatus = async (appId, status) => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this applicant?`)) {
      return;
    }

    try {
      const ref = doc(db, "jobApplications", appId);
      await updateDoc(ref, { status });
      await loadJobsAndApplicants(company.id);
      alert(`✅ Application ${status.toLowerCase()}!`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status. Please try again.");
    }
  };

  // ------------------ QUALIFICATION SYSTEM ------------------
  const evaluateApplicant = (profile, job) => {
    let score = 0;

    const gpa = parseFloat(profile.gpa || 0);
    if (gpa >= (job.minGPA || 2.5)) score += 40;

    const hasSkills = job.requiredSkills && job.requiredSkills.some((skill) =>
      (profile.skills || "").toLowerCase().includes(skill)
    );
    if (hasSkills) score += 30;

    const certCount = profile.certificates?.length || 0;
    score += Math.min(certCount * 5, 15);

    const exp = profile.experienceYears || 0;
    if (exp >= (job.minExperience || 0)) score += Math.min(exp * 5, 15);

    if (score >= 75) return "qualified";
    if (score >= 50) return "partial";
    return "not-qualified";
  };

  const getQualificationText = (status) => {
    switch(status) {
      case "qualified": return "Qualified for Interview";
      case "partial": return "Partially Qualified";
      default: return "Not Qualified";
    }
  };

  // ------------------ RENDER CONTENT ------------------
  const renderContent = () => {
    if (loading) {
      return (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Loading your dashboard...</h3>
        </div>
      );
    }

    if (!company) {
      return (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Company not found</h3>
          <p>We couldn't load your company data. Please contact support.</p>
        </div>
      );
    }

    switch (activeSection) {
      case "post-job":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-icon">💼</div>
              <h2 className="card-title">Create New Job Posting</h2>
            </div>
            
            <form onSubmit={postJob} className="modern-form">
              <div className="form-group full-width">
                <label className="form-label">Job Title</label>
                <input
                  className="form-input"
                  placeholder="e.g., Senior Frontend Developer"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">Job Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the role, responsibilities, and requirements..."
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  required
                  rows="4"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Minimum GPA</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  placeholder="3.0"
                  value={newJob.minGPA}
                  onChange={(e) => setNewJob({ ...newJob, minGPA: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Minimum Experience</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="2 years"
                  value={newJob.minExperience}
                  onChange={(e) => setNewJob({ ...newJob, minExperience: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Job Type</label>
                <select
                  className="form-select"
                  value={newJob.jobType}
                  onChange={(e) => setNewJob({ ...newJob, jobType: e.target.value })}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  className="form-input"
                  placeholder="e.g., New York, NY or Remote"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Salary Range</label>
                <input
                  className="form-input"
                  placeholder="e.g., $80,000 - $120,000"
                  value={newJob.salary}
                  onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                />
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">Required Skills (comma separated)</label>
                <input
                  className="form-input"
                  placeholder="react, javascript, node.js, aws"
                  value={newJob.requiredSkills}
                  onChange={(e) => setNewJob({ ...newJob, requiredSkills: e.target.value })}
                />
              </div>
              
              <button type="submit" className="submit-btn">
                <PlusIcon /> Publish Job Opening
              </button>
            </form>
          </div>
        );

      case "jobs":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-icon">📋</div>
              <h2 className="card-title">Job Listings</h2>
            </div>
            
            {jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Jobs Posted Yet</h3>
                <p>Start hiring by creating your first job posting.</p>
                <button 
                  className="cta-button"
                  onClick={() => setActiveSection("post-job")}
                >
                  <PlusIcon /> Create Your First Job
                </button>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card" onClick={() => setSelectedJob(null)}>
                    <div className="stat-number">{jobs.length}</div>
                    <div className="stat-label">Total Jobs</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{applicants.length}</div>
                    <div className="stat-label">Total Applicants</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {applicants.filter(a => a.status === "Shortlisted").length}
                    </div>
                    <div className="stat-label">Shortlisted</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {applicants.filter(a => !a.status || a.status === "Pending").length}
                    </div>
                    <div className="stat-label">Pending Review</div>
                  </div>
                </div>
                
                <h3 style={{ color: '#fff', margin: '30px 0 20px' }}>Active Positions</h3>
                
                <div className="jobs-grid">
                  {jobs.map((job) => (
                    <div key={job.id} className="job-listing" onClick={() => setSelectedJob(job)}>
                      <h4 className="job-title">{job.title}</h4>
                      
                      <div className="job-meta">
                        <span className="meta-tag">{job.jobType || "Full-time"}</span>
                        <span className="meta-tag">{job.location || "Remote"}</span>
                        {job.salary && <span className="meta-tag">💰 {job.salary}</span>}
                        <span className="meta-tag">🎓 GPA: {job.minGPA}+</span>
                        {job.minExperience > 0 && (
                          <span className="meta-tag">💼 {job.minExperience}+ yrs</span>
                        )}
                      </div>
                      
                      <p className="job-description">
                        {job.description.length > 150 
                          ? `${job.description.substring(0, 150)}...` 
                          : job.description}
                      </p>
                      
                      <div className="job-footer">
                        <div className="applicant-count">
                          👥 {applicants.filter(a => a.jobId === job.id).length} applicants
                        </div>
                        <button className="view-btn">View Details →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case "applicants":
        return selectedJob ? (
          <div className="dashboard-card applicant-modal">
            <div className="card-header">
              <div className="card-icon">👥</div>
              <div>
                <h2 className="card-title">{selectedJob.title}</h2>
                <p style={{ color: '#a0a0c0', marginTop: '5px' }}>
                  Applicants for this position
                </p>
              </div>
              <button 
                className="view-btn" 
                onClick={() => setSelectedJob(null)}
                style={{ marginLeft: 'auto' }}
              >
                ← Back to Jobs
              </button>
            </div>
            
            {applicants.filter(a => a.jobId === selectedJob.id).length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-icon">👤</div>
                <h3>No Applicants Yet</h3>
                <p>This job hasn't received any applications yet.</p>
              </div>
            ) : (
              <div className="applicant-grid">
                {applicants
                  .filter((a) => a.jobId === selectedJob.id)
                  .map((a) => {
                    const qualificationStatus = evaluateApplicant(a, selectedJob);
                    
                    return (
                      <div key={a.id} className="applicant-card">
                        <div className="applicant-header">
                          <div className="applicant-info">
                            <h4>{a.studentName}</h4>
                            <p style={{ color: '#8888aa', margin: 0 }}>{a.studentEmail}</p>
                            <div className="applicant-stats">
                              <div className="applicant-stat">
                                <span>🎓</span> GPA: {a.gpa || "N/A"}
                              </div>
                              <div className="applicant-stat">
                                <span>💼</span> Exp: {a.experienceYears || 0} yrs
                              </div>
                              <div className="applicant-stat">
                                <span>📄</span> Skills: {(a.skills || "").split(",").slice(0, 3).join(", ")}
                              </div>
                            </div>
                          </div>
                          <div className={`qualification-badge ${qualificationStatus}`}>
                            {getQualificationText(qualificationStatus)}
                          </div>
                        </div>
                        
                        <div className="action-buttons">
                          <button 
                            className="action-btn shortlist-btn"
                            onClick={() => updateStatus(a.id, "Shortlisted")}
                          >
                            Shortlist Candidate
                          </button>
                          <button 
                            className="action-btn reject-btn"
                            onClick={() => updateStatus(a.id, "Rejected")}
                          >
                            Reject Application
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : renderDashboard();

      case "profile":
        return (
          <div className="dashboard-card">
            <div className="card-header">
              <SettingsIcon />
              <h2 className="card-title">Company Profile</h2>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">
                  {new Date(company.createdAt).getFullYear()}
                </div>
                <div className="stat-label">Member Since</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{jobs.length}</div>
                <div className="stat-label">Jobs Posted</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{applicants.length}</div>
                <div className="stat-label">Total Applicants</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {applicants.filter(a => a.status === "Shortlisted").length}
                </div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(15, 15, 26, 0.6)', 
              padding: '25px', 
              borderRadius: '16px',
              marginTop: '30px'
            }}>
              <h3 style={{ color: '#fff', marginBottom: '20px' }}>Company Information</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div>
                  <label style={{ color: '#a0a0c0', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                    Company Name
                  </label>
                  <div style={{ 
                    background: 'rgba(28, 28, 43, 0.8)', 
                    padding: '12px 16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(122, 92, 255, 0.1)'
                  }}>
                    {company.name || "Not set"}
                  </div>
                </div>
                
                <div>
                  <label style={{ color: '#a0a0c0', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                    Email Address
                  </label>
                  <div style={{ 
                    background: 'rgba(28, 28, 43, 0.8)', 
                    padding: '12px 16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(122, 92, 255, 0.1)'
                  }}>
                    {company.email}
                  </div>
                </div>
                
                <div>
                  <label style={{ color: '#a0a0c0', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                    Account Type
                  </label>
                  <div style={{ 
                    background: 'rgba(28, 28, 43, 0.8)', 
                    padding: '12px 16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(122, 92, 255, 0.1)'
                  }}>
                    <span style={{ color: '#00c9a7' }}>{company.role}</span>
                  </div>
                </div>
                
                <div>
                  <label style={{ color: '#a0a0c0', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                    Account Status
                  </label>
                  <div style={{ 
                    background: 'rgba(28, 28, 43, 0.8)', 
                    padding: '12px 16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(122, 92, 255, 0.1)'
                  }}>
                    <span style={{ color: '#00c9a7', fontWeight: '600' }}>
                      {company.status || "Active"} ✓
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '30px' }}>
                <h4 style={{ color: '#fff', marginBottom: '15px' }}>Update Profile (Coming Soon)</h4>
                <p style={{ color: '#a0a0c0', lineHeight: '1.6' }}>
                  We're working on a comprehensive profile update system that will allow you to 
                  add company details, logo, description, and more. Stay tuned!
                </p>
              </div>
            </div>
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
        <div className="stat-card" onClick={() => setActiveSection("jobs")}>
          <div className="stat-number">{jobs.length}</div>
          <div className="stat-label">Active Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{applicants.length}</div>
          <div className="stat-label">Total Applicants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {applicants.filter(a => a.status === "Shortlisted").length}
          </div>
          <div className="stat-label">Shortlisted</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {Math.round((applicants.filter(a => a.status === "Shortlisted").length / 
              Math.max(applicants.length, 1)) * 100)}%
          </div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-icon">⚡</div>
          <h2 className="card-title">Quick Actions</h2>
        </div>
        
        <div className="quick-actions">
          <div className="action-card" onClick={() => setActiveSection("post-job")}>
            <div className="action-icon">💼</div>
            <h3 className="action-label">Post New Job</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("jobs")}>
            <div className="action-icon">📋</div>
            <h3 className="action-label">View Job Listings</h3>
          </div>
          
          <div className="action-card" onClick={() => {
            if (jobs.length > 0) {
              setActiveSection("applicants");
              setSelectedJob(jobs[0]);
            } else {
              setActiveSection("post-job");
            }
          }}>
            <div className="action-icon">👥</div>
            <h3 className="action-label">Review Applicants</h3>
          </div>
          
          <div className="action-card" onClick={() => setActiveSection("profile")}>
            <div className="action-icon">⚙️</div>
            <h3 className="action-label">Company Profile</h3>
          </div>
        </div>
      </div>

      {/* Recent Job Listings */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-icon">📈</div>
          <h2 className="card-title">Recent Job Listings</h2>
        </div>
        
        {jobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">📭</div>
            <h3>No Jobs Posted Yet</h3>
            <p>Start building your team by creating your first job posting.</p>
            <button 
              className="cta-button"
              onClick={() => setActiveSection("post-job")}
            >
              <PlusIcon /> Create Your First Job
            </button>
          </div>
        ) : (
          <div className="jobs-grid">
            {jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="job-listing" onClick={() => {
                setActiveSection("applicants");
                setSelectedJob(job);
              }}>
                <h4 className="job-title">{job.title}</h4>
                
                <div className="job-meta">
                  <span className="meta-tag">{job.jobType || "Full-time"}</span>
                  <span className="meta-tag">{job.location || "Remote"}</span>
                  <span className="meta-tag">👥 {applicants.filter(a => a.jobId === job.id).length}</span>
                </div>
                
                <p className="job-description">
                  {job.description.length > 100 
                    ? `${job.description.substring(0, 100)}...` 
                    : job.description}
                </p>
                
                <div className="job-footer">
                  <div className="applicant-count">
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  <button className="view-btn">View Details →</button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {jobs.length > 3 && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              className="view-btn"
              onClick={() => setActiveSection("jobs")}
              style={{ padding: '12px 24px' }}
            >
              View All {jobs.length} Jobs →
            </button>
          </div>
        )}
      </div>

      {/* Recent Applicants */}
      {applicants.length > 0 && (
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon">🎯</div>
            <h2 className="card-title">Recent Applicants</h2>
          </div>
          
          <div className="applicant-grid">
            {applicants.slice(0, 3).map((a) => {
              const job = jobs.find(j => j.id === a.jobId);
              if (!job) return null;
              
              const qualificationStatus = evaluateApplicant(a, job);
              
              return (
                <div key={a.id} className="applicant-card">
                  <div className="applicant-header">
                    <div className="applicant-info">
                      <h4>{a.studentName}</h4>
                      <p style={{ color: '#8888aa', margin: '5px 0' }}>Applied for: {job.title}</p>
                      <div className="applicant-stats">
                        <div className="applicant-stat">
                          <span>🎓</span> GPA: {a.gpa || "N/A"}
                        </div>
                        <div className="applicant-stat">
                          <span>📅</span> {new Date(a.date || a.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`qualification-badge ${qualificationStatus}`}>
                      {getQualificationText(qualificationStatus)}
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      className="action-btn shortlist-btn"
                      onClick={() => updateStatus(a.id, "Shortlisted")}
                    >
                      Shortlist
                    </button>
                    <button 
                      className="action-btn reject-btn"
                      onClick={() => updateStatus(a.id, "Rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {applicants.length > 3 && (
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button 
                className="view-btn"
                onClick={() => setActiveSection("applicants")}
                style={{ padding: '12px 24px' }}
              >
                View All {applicants.length} Applicants →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="company-page">
      {/* Modern Sidebar */}
      <div className="company-sidebar">
        <div className="company-logo">
          <h2>🚀 Company</h2>
        </div>
        
        <nav className="company-nav">
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
                className={`nav-item ${activeSection === "post-job" ? "active" : ""}`}
                onClick={() => setActiveSection("post-job")}
              >
                <JobIcon /> Post New Job
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "jobs" ? "active" : ""}`}
                onClick={() => setActiveSection("jobs")}
              >
                <BriefcaseIcon /> Job Listings
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "applicants" ? "active" : ""}`}
                onClick={() => setActiveSection("applicants")}
              >
                <ApplicantsIcon /> Applicants
              </a>
            </li>
            <li>
              <a 
                href="#!" 
                className={`nav-item ${activeSection === "profile" ? "active" : ""}`}
                onClick={() => setActiveSection("profile")}
              >
                <ProfileIcon /> Company Profile
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
      <div className="company-content">
        <div className="content-header">
          <h1>
            Welcome back,{" "}
            <span style={{ background: 'linear-gradient(135deg, #00c9a7, #00a98e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {company?.name || "Company"}
            </span>
          </h1>
          <div className="header-stats">
            <span className="stat-pill">💼 {jobs.length} Jobs</span>
            <span className="stat-pill">👥 {applicants.length} Applicants</span>
            <span className="stat-pill">📈 {company?.status || "Active"}</span>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}