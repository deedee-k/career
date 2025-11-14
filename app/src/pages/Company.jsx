import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
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

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    minGPA: "",
    requiredSkills: "",
  });
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await loadCompany(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadCompany = async (uid) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = { id: uid, ...snap.data() };
      setCompany(data);
      await loadJobs(uid);
    } else {
      alert("⚠️ Company not found. Please register as a company.");
    }
  };

  const loadJobs = async (companyId) => {
    const q = query(collection(db, "jobs"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    const jobList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setJobs(jobList);

    // Load all applications for this company's jobs
    const appsSnap = await getDocs(collection(db, "jobApplications"));
    const allApps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setApplicants(allApps.filter((a) => jobList.some((j) => j.id === a.jobId)));
  };

  const postJob = async (e) => {
    e.preventDefault();
    if (!company) return;

    const jobData = {
      ...newJob,
      companyId: company.id,
      companyName: company.name || company.email,
      minGPA: parseFloat(newJob.minGPA) || 2.5,
      requiredSkills: newJob.requiredSkills
        .split(",")
        .map((s) => s.trim().toLowerCase()),
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "jobs"), jobData);
    setNewJob({ title: "", description: "", minGPA: "", requiredSkills: "" });
    await loadJobs(company.id);
    alert("✅ Job posted successfully!");
  };

  const updateStatus = async (appId, status) => {
    const ref = doc(db, "jobApplications", appId);
    await updateDoc(ref, { status });
    await loadJobs(company.id);
  };

  if (!company) return <p>Loading company...</p>;

  return (
    <div className="company-page">
      <Navbar title="Company Dashboard" />
      <div className="company-content">
        <h2>🏢 Welcome, {company.name || company.email}</h2>

        {/* JOB POSTING FORM */}
        <section>
          <h3>📝 Post a Job</h3>
          <form onSubmit={postJob} className="form-section">
            <input
              placeholder="Job Title"
              value={newJob.title}
              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Job Description"
              value={newJob.description}
              onChange={(e) =>
                setNewJob({ ...newJob, description: e.target.value })
              }
              required
            />
            <input
              placeholder="Minimum GPA"
              value={newJob.minGPA}
              onChange={(e) => setNewJob({ ...newJob, minGPA: e.target.value })}
            />
            <input
              placeholder="Required Skills (comma separated)"
              value={newJob.requiredSkills}
              onChange={(e) =>
                setNewJob({ ...newJob, requiredSkills: e.target.value })
              }
            />
            <button type="submit">Post Job</button>
          </form>
        </section>

        {/* JOB LISTINGS */}
        <section>
          <h3>💼 Your Job Listings</h3>
          {jobs.length === 0 ? (
            <p>No jobs posted yet.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="job-card">
                <h4>{job.title}</h4>
                <p>{job.description}</p>
                <p>📊 Min GPA: {job.minGPA}</p>
                <p>🧠 Skills: {job.requiredSkills.join(", ")}</p>
                <hr />
                <h5>Applicants:</h5>
                <ul>
                  {applicants
                    .filter((a) => a.jobId === job.id)
                    .map((a) => (
                      <li key={a.id}>
                        {a.studentName} — {a.status}
                        <button onClick={() => updateStatus(a.id, "Shortlisted")}>
                          Shortlist
                        </button>
                        <button onClick={() => updateStatus(a.id, "Rejected")}>
                          Reject
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
