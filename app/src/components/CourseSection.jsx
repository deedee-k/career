import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import "../styles/Courses.css";

export default function CoursesSection() {
  const [institutions, setInstitutions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      loadInstitutions();
      loadCourses();
      loadApplications();
    }
  }, [user]);

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

  const loadApplications = async () => {
    const q = query(collection(db, "applications"), where("studentId", "==", user.uid));
    const snap = await getDocs(q);
    setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const applyForCourses = async () => {
    if (!selectedInstitution || selectedCourses.length === 0) {
      alert("Please select an institution and at least one course.");
      return;
    }

    if (selectedCourses.length > 2) {
      alert("⚠️ You can only apply for up to 2 courses per institution.");
      return;
    }

    const alreadyApplied = applications.some(
      (a) => a.institution === selectedInstitution.name
    );
    if (alreadyApplied) {
      alert("❌ You already applied to this institution.");
      return;
    }

    for (const courseName of selectedCourses) {
      const course = courses.find((c) => c.name === courseName);
      const minGPA = parseFloat(course?.minGPA || 2.5);
      const studentGPA = parseFloat(auth.currentUser.gpa || 0);
      if (studentGPA < minGPA) {
        alert(`❌ You don't qualify for ${courseName} (Min GPA: ${minGPA})`);
        return;
      }
    }

    await addDoc(collection(db, "applications"), {
      studentId: user.uid,
      studentName: user.displayName || user.email,
      institution: selectedInstitution.name,
      courses: selectedCourses,
      status: "Pending",
      date: new Date().toISOString(),
    });

    alert("✅ Application submitted!");
    setSelectedCourses([]);
    setSelectedInstitution(null);
    loadApplications();
  };

  return (
    <section className="courses-section">
      <h2>📘 Apply for Courses</h2>

      {/* ===== Institutions Grid ===== */}
      {!selectedInstitution && (
        <div className="institutions-grid">
          {institutions.map((inst) => (
            <div
              key={inst.id}
              className="institution-card"
              onClick={() => setSelectedInstitution(inst)}
            >
              <h3>{inst.name}</h3>
              {inst.location && <p>{inst.location}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ===== Courses for Selected Institution ===== */}
      {selectedInstitution && (
        <>
          <button
            className="back-btn"
            onClick={() => {
              setSelectedInstitution(null);
              setSelectedCourses([]);
            }}
          >
            ⬅ Back to Institutions
          </button>

          <h3>Available Courses at {selectedInstitution.name}</h3>
          <div className="courses-grid">
            {courses
              .filter((c) => c.institutionName === selectedInstitution.name)
              .map((c) => {
                const selected = selectedCourses.includes(c.name);
                return (
                  <div
                    key={c.id}
                    className={`course-card ${selected ? "selected" : ""}`}
                    onClick={() => {
                      if (selected) {
                        setSelectedCourses(
                          selectedCourses.filter((x) => x !== c.name)
                        );
                      } else {
                        setSelectedCourses([...selectedCourses, c.name]);
                      }
                    }}
                  >
                    <h4>{c.name}</h4>
                    <p>Min GPA: {c.minGPA || 2.5}</p>
                    {c.description && <p>{c.description}</p>}
                  </div>
                );
              })}
          </div>

          <button className="apply-btn" onClick={applyForCourses}>
            Apply Selected Courses
          </button>
        </>
      )}
    </section>
  );
}
