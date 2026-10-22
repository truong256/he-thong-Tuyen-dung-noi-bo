async function testPersistence() {
  const loginRes = await fetch("http://localhost:8080/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo.hr_manager@example.invalid", password: "DemoHrManager2026!@#SecurePass2" })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log("[RESTART TEST] Đăng nhập lại sau khi restart backend:", !!token);

  const candidatesRes = await fetch("http://localhost:8080/api/candidates", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const candidates = await candidatesRes.json();
  const c = candidates.content[0];
  console.log("[RESTART TEST] Hồ sơ ứng viên sau restart:", {
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    stage: c.stage,
    cvFileName: c.cvFileName
  });

  const cvRes = await fetch(`http://localhost:8080/api/candidates/${c.id}/cv`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const cvBuffer = await cvRes.arrayBuffer();
  console.log("[RESTART TEST] Tải tệp CV nhị phân sau restart: HTTP", cvRes.status, "Size:", cvBuffer.byteLength, "bytes");
  if (cvRes.status === 200 && cvBuffer.byteLength === 316) {
    console.log("=== THÀNH CÔNG: DỮ LIỆU VÀ TỆP CV VẬT LÝ HOÀN TOÀN TỒN TẠI NGUYÊN VẸN SAU RESTART! ===");
  } else {
    throw new Error("CV file failed verification after restart!");
  }
}

testPersistence().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});
