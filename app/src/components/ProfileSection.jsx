import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfileSection() {
  const [profile, setProfile] = useState({});
  const user = auth.currentUser;

  useEffect(() => {
    if (user) loadProfile(user.uid);
  }, [user]);

  const loadProfile = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) setProfile(snap.data());
    else {
      const newProfile = {
        uid,
        email: user.email,
        role: "student",
        createdAt: new Date().toISOString(),
        experienceYears: 0,
      };
      await setDoc(doc(db, "users", uid), newProfile);
      setProfile(newProfile);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.uid), profile);
      alert("✅ Profile updated!");
    } catch (err) {
      alert("❌ Failed to update profile: " + err.message);
    }
  };

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

  return (
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
            setProfile({ ...profile, experienceYears: parseFloat(e.target.value) })
          }
        />
        <button type="submit">Update</button>
      </form>

      <div className="upload-section">
        <label>Upload Transcript:</label>
        <input type="file" onChange={(e) => uploadFile(e, "transcript")} />
        <label>Upload Certificates:</label>
        <input type="file" onChange={(e) => uploadFile(e, "certificates")} />
      </div>
    </section>
  );
}
