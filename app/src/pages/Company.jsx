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
    minExperience: "",       // NEW
    requiredSkills: "",
  });
  const [applicants, setApplicants] = useState([]);

  // ------------------ LOAD COMPANY ------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) await loadCompany(user.uid);
    });
    return () => unsub();
  }, []);

  const loadCompany = async (uid) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = { id: uid, ...snap.data() };
      setCompany(data);
      await loadJobs(uid);
    } else {
      alert("⚠️ Company data missing");
    }
  };

  // ------------------ LOAD JOBS + APPLICANTS ------------------
  const loadJobs = async (companyId) => {
    const q = query(collection(db, "jobs"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    const jobList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setJobs(jobList);

    const appsSnap = await getDocs(collection(db, "jobApplications"));
    const allApps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Only apps belonging to this company's jobs
    setApplicants(allApps.filter((a) => jobList.some((j) => j.id === a.jobId)));
  };

  // ------------------ POST JOB ------------------
  const postJob = async (e) => {
    e.preventDefault();
    if (!company) return;

    const jobData = {
      ...newJob,
      companyId: company.id,
      companyName: company.name || company.email,
      minGPA: parseFloat(newJob.minGPA) || 2.5,
      minExperience: parseFloat(newJob.minExperience) || 0, // NEW
      requiredSkills: newJob.requiredSkills
        .split(",")
        .map((s) => s.trim().toLowerCase()),
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "jobs"), jobData);
    setNewJob({ title: "", description: "", minGPA: "", minExperience: "", requiredSkills: "" });
    await loadJobs(company.id);
  };

  // ------------------ UPDATE APPLICATION STATUS ------------------
  const updateStatus = async (appId, status) => {
    const ref = doc(db, "jobApplications", appId);
    await updateDoc(ref, { status });
    await loadJobs(company.id);
  };

  // ------------------ QUALIFICATION SYSTEM ------------------
  const evaluateApplicant = (profile, job) => {
    let score = 0;

    const gpa = parseFloat(profile.gpa || 0);
    if (gpa >= (job.minGPA || 2.5)) score += 40;

    const hasSkills =
      job.requiredSkills &&
      job.requiredSkills.some((skill) =>
        (profile.skills || "").toLowerCase().includes(skill)
      );
    if (hasSkills) score += 30;

    const certCount = profile.certificates?.length || 0;
    score += Math.min(certCount * 5, 15);

    const exp = profile.experienceYears || 0;
    if (exp >= (job.minExperience || 0)) score += Math.min(exp * 5, 15); // NEW

    if (score >= 75) return "Qualified for Interview";
    if (score >= 50) return "Partially Qualified";
    return "Not Qualified";
  };

  if (!company) return <p>Loading…</p>;

  return (
    <div className="company-page">
      <Navbar title="Company Dashboard" />
      <div className="company-content">
        <h2>🏢 Welcome, {company.name || company.email}</h2>

        {/* ------------------ POST JOB ------------------ */}
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
              placeholder="Minimum Experience (years)"   // NEW
              value={newJob.minExperience}
              onChange={(e) =>
                setNewJob({ ...newJob, minExperience: e.target.value })
              }
            />
            <input
              placeholder="Required Skills (comma separated)"
              value={newJob.requiredSkills}
              onChange={(e) =>
                setNewJob({ ...newJob, requiredSkills: e.target.value })
              }
            />
            <button>Post Job</button>
          </form>
        </section>

        {/* ------------------ JOBS + APPLICANTS ------------------ */}
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
                <p>💼 Min Experience: {job.minExperience} years</p> {/* NEW */}
                <p>🧠 Skills: {job.requiredSkills.join(", ")}</p>
                <hr />
                <h5>Applicants:</h5>

                <ul>
                  {applicants
                    .filter((a) => a.jobId === job.id)
                    .map((a) => {
                      const status = evaluateApplicant(a, job);

                      return (
                        <li key={a.id}>
                          <div>
                            <b>{a.studentName}</b>
                            <br />
                            <span>🎓 GPA: {a.gpa || "N/A"}</span>
                            <br />
                            <span>💼 Experience: {a.experienceYears || 0} years</span> {/* NEW */}
                            <br />
                            <span className="qualify-tag">{status}</span>
                          </div>

                          <div>
                            <button onClick={() => updateStatus(a.id, "Shortlisted")}>
                              Shortlist
                            </button>
                            <button onClick={() => updateStatus(a.id, "Rejected")}>
                              Reject
                            </button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* ------------------ PROFILE UPDATE ------------------ */}
        <section>
          <h3>⚙ Update Company Profile</h3>
          <p>Coming soon…</p>
        </section>
      </div>
    </div>
  );
}
