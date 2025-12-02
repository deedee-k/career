import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function AdmissionsSection() {
  const [admissions, setAdmissions] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) loadAdmissions();
  }, [user]);

  const loadAdmissions = async () => {
    const q = query(collection(db, "admissions"), where("studentId", "==", user.uid));
    const snap = await getDocs(q);
    setAdmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const confirmAdmission = async (chosen) => {
    const others = admissions.filter((a) => a.id !== chosen.id);
    for (const a of others) {
      await deleteDoc(doc(db, "admissions", a.id));
    }
    alert(`🎓 You confirmed admission at ${chosen.institution}`);
    loadAdmissions();
  };

  return (
    <section>
      <h3>🎓 Admissions</h3>
      {admissions.length === 0 ? (
        <p>No admissions yet.</p>
      ) : (
        <ul>
          {admissions.map((a) => (
            <li key={a.id}>
              Admitted at <b>{a.institution}</b> — {Array.isArray(a.courses) ? a.courses.join(", ") : a.courses}
              <button onClick={() => confirmAdmission(a)}>Confirm</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
