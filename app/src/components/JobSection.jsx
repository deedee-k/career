import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

export default function JobsSection() {
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState({});
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      loadJobs();
      loadProfile();
    }
  }, [user]);

  const loadJobs = async () => {
    const snap = await getDocs(collection(db, "jobs"));
    setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadProfile = async () => {
    const snap = await getDocs(collection(db, "users"));
    const u = snap.docs.find((d) => d.id === user.uid);
    if (u) setProfile(u.data());
  };

  return (
    <section>
      <h3>💼 Job Opportunities</h3>
      {jobs.length === 0 ? (
        <p>No job postings yet.</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => {
            const qualifies =
              parseFloat(profile.gpa || 0) >= (job.minGPA || 2.5) &&
              (profile.experienceYears || 0) >= (job.minExperience || 0) &&
              (!job.requiredSkills ||
                job.requiredSkills.some((skill) =>
                  (profile.skills || "").toLowerCase().includes(skill.toLowerCase())
                ));

            return (
              <div key={job.id} className="job-card">
                <b>{job.title}</b> at {job.companyName}
                <p>{job.description}</p>

                <div className="qual-box">
                  <p><b>Min GPA:</b> {job.minGPA || 2.5}</p>
                  <p><b>Min Experience:</b> {job.minExperience || 0} years</p>
                  {job.requiredSkills?.length > 0 && (
                    <div className="skill-list">
                      {job.requiredSkills.map((skill, idx) => (
                        <span key={idx} className="skill-tag">{skill}</span>
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
