const API_URL = "http://localhost:5000";

export const fetchSummary = async () => {
  const res = await fetch(`${API_URL}/reports/summary`);
  return res.json();
};
