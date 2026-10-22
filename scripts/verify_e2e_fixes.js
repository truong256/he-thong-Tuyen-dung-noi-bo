const fs = require('fs');
const path = require('path');

async function main() {
    console.log("=== BẮT ĐẦU KIỂM THỬ XÁC MINH CÁC LỖI ĐÃ SỬA ===");

    // 1. Đăng nhập lấy token các tài khoản
    console.log("\n--- BƯỚC 1: ĐĂNG NHẬP LẤY TOKEN ---");
    async function login(username, password) {
        const res = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Login failed for ${username}: ${JSON.stringify(data)}`);
        return data.accessToken || data.token;
    }

    const hrToken = await login('hr_manager@company.com', 'Password123@');
    console.log("HR Manager Token:", hrToken ? "OK" : "FAILED");

    const recruiterToken = await login('recruiter@company.com', 'Password123@');
    console.log("Recruiter Token:", recruiterToken ? "OK" : "FAILED");

    const hmToken = await login('hiring_manager@company.com', 'Password123@');
    console.log("Hiring Manager Token:", hmToken ? "OK" : "FAILED");

    // 2. KIỂM THỬ BUG 05: Validation trả về HTTP 400 khi thiếu departmentId
    console.log("\n--- BƯỚC 2: KIỂM THỬ BUG 05 (Validation HTTP 400 thay vì 500) ---");
    const bug05Res = await fetch('http://localhost:8080/api/recruitment-requests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hmToken}`
        },
        body: JSON.stringify({
            title: "Yêu cầu tuyển dụng thiếu departmentId"
        })
    });
    console.log(`Status trả về: HTTP ${bug05Res.status} (Kỳ vọng: 400)`);
    const bug05Data = await bug05Res.json();
    console.log("Response body:", JSON.stringify(bug05Data));
    if (bug05Res.status === 400) {
        console.log("=> BUG 05 ĐÃ ĐƯỢC KHẮC PHỤC THÀNH CÔNG (HTTP 400 BAD REQUEST)!");
    } else {
        console.error("=> BUG 05 THẤT BẠI! Status không phải 400:", bug05Res.status);
    }

    // 3. KIỂM THỬ BUG 03: Recruiter truy cập danh sách ứng viên được phân công
    console.log("\n--- BƯỚC 3: KIỂM THỬ BUG 03 (Recruiter truy cập /api/candidates) ---");
    const recruiterCandidatesRes = await fetch('http://localhost:8080/api/candidates?page=0&size=10', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${recruiterToken}`
        }
    });
    console.log(`Status trả về cho Recruiter: HTTP ${recruiterCandidatesRes.status} (Kỳ vọng: 200)`);
    if (recruiterCandidatesRes.status === 200) {
        const data = await recruiterCandidatesRes.json();
        console.log(`Số ứng viên trả về cho Recruiter: ${data.totalElements ?? data.length ?? 'OK'}`);
        console.log("=> BUG 03 ĐÃ ĐƯỢC KHẮC PHỤC THÀNH CÔNG (RECRUITER 200 OK)!");
    } else {
        console.error("=> BUG 03 THẤT BẠI! Status:", recruiterCandidatesRes.status);
    }

    // 4. KIỂM THỬ BUG 04: Gọi /api/candidates với JWT Bearer hợp lệ
    console.log("\n--- BƯỚC 4: KIỂM THỬ BUG 04 (API candidates với JWT token) ---");
    const hrCandidatesRes = await fetch('http://localhost:8080/api/candidates?page=0&size=10', {
        headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    console.log(`HR Manager lấy danh sách ứng viên với JWT: HTTP ${hrCandidatesRes.status} (Kỳ vọng: 200)`);
    if (hrCandidatesRes.status === 200) {
        console.log("=> BUG 04 ĐÃ ĐƯỢC KHẮC PHỤC THÀNH CÔNG (JWT ACCESS TOKEN ĐƯỢC CHẤP NHẬN)!");
    } else {
        console.error("=> BUG 04 THẤT BẠI! Status:", hrCandidatesRes.status);
    }

    // 5. Lấy danh sách tin tuyển dụng công khai để ứng tuyển
    console.log("\n--- BƯỚC 5: LẤY DANH SÁCH TIN TUYỂN DỤNG CÔNG KHAI ---");
    const publicJobsRes = await fetch('http://localhost:8080/api/public/job-postings?page=0&size=10');
    const publicJobs = await publicJobsRes.json();
    const jobList = publicJobs.content || publicJobs;
    console.log(`Tìm thấy ${jobList.length} tin tuyển dụng.`);
    let targetJob = jobList.find(j => j.status === 'PUBLISHED') || jobList[0];

    if (!targetJob) {
        console.log("Chưa có tin tuyển dụng nào PUBLISHED. Sẽ tạo tin và xuất bản trong luồng E2E.");
    } else {
        console.log(`Tin tuyển dụng mục tiêu: ID=${targetJob.id}, Title="${targetJob.title}"`);
        
        // 6. KIỂM THỬ BUG 01 & BUG 02: Nộp hồ sơ với file CV thật qua Multipart
        console.log("\n--- BƯỚC 6: KIỂM THỬ BUG 01 & BUG 02 (NỘP HỒ SƠ VỚI CV THẬT) ---");
        // Tạo một file PDF thật
        const pdfContent = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF");
        const tempPdfPath = path.join(__dirname, 'test_real_cv.pdf');
        fs.writeFileSync(tempPdfPath, pdfContent);

        const formData = new FormData();
        formData.append('fullName', 'Nguyễn Văn Ứng Viên Thật');
        formData.append('email', `ungvien.that.${Date.now()}@example.com`);
        formData.append('phone', '0912345678');
        formData.append('coverLetter', 'Tôi xin ứng tuyển với CV PDF thật đính kèm.');
        const fileBlob = new Blob([pdfContent], { type: 'application/pdf' });
        formData.append('cvFile', fileBlob, 'nguyen_van_a_cv.pdf');

        const applyRes = await fetch(`http://localhost:8080/api/public/job-postings/${targetJob.id}/apply`, {
            method: 'POST',
            body: formData
        });

        console.log(`Status nộp hồ sơ multipart: HTTP ${applyRes.status}`);
        const applyData = await applyRes.json();
        console.log("Kết quả nộp hồ sơ:", JSON.stringify(applyData, null, 2));

        const appId = applyData.applicationId || applyData.id;
        if (applyRes.ok && appId) {
            console.log("=> NỘP HỒ SƠ MULTIPART THÀNH CÔNG! Application ID:", appId);

            // Kiểm tra BUG 02: Dữ liệu phone, coverLetter, cvFileUrl đã lưu trong DB chưa
            console.log("\n--- KIỂM TRA DỮ LIỆU CSDL (BUG 02) ---");
            const getAppRes = await fetch(`http://localhost:8080/api/candidates?page=0&size=50`, {
                headers: { 'Authorization': `Bearer ${hrToken}` }
            });
            const candidatesData = await getAppRes.json();
            const candidateList = candidatesData.content || candidatesData;
            const savedCandidate = candidateList.find(c => c.id === appId);

            if (savedCandidate) {
                console.log("Dữ liệu ứng viên lấy từ API:", JSON.stringify(savedCandidate, null, 2));
                const phoneSaved = savedCandidate.phone === '0912345678';
                const coverLetterSaved = savedCandidate.coverLetter && savedCandidate.coverLetter.includes('Tôi xin ứng tuyển');
                const cvSaved = savedCandidate.cvFileUrl || savedCandidate.cvFileName;

                console.log("Phone đã lưu:", phoneSaved ? "PASS" : "FAIL");
                console.log("Cover Letter đã lưu:", coverLetterSaved ? "PASS" : "FAIL");
                console.log("CV File đã lưu:", cvSaved ? "PASS" : "FAIL");

                if (phoneSaved && coverLetterSaved && cvSaved) {
                    console.log("=> BUG 02 ĐÃ ĐƯỢC KHẮC PHỤC HOÀN TOÀN (LƯU ĐẦY ĐỦ THÔNG TIN VÀO CSDL)!");
                } else {
                    console.error("=> BUG 02 THẤT BẠI! Thiếu một số trường dữ liệu.");
                }

                // Kiểm tra BUG 01: Tải về CV thật qua endpoint bảo mật
                console.log("\n--- KIỂM TRA TẢI VỀ CV THẬT (BUG 01) ---");
                const downloadCvRes = await fetch(`http://localhost:8080/api/candidates/${appId}/cv`, {
                    headers: { 'Authorization': `Bearer ${hrToken}` }
                });
                console.log(`Status tải CV: HTTP ${downloadCvRes.status} (Kỳ vọng: 200)`);
                const contentType = downloadCvRes.headers.get('content-type');
                console.log(`Content-Type tải về: ${contentType}`);
                const cvBuffer = await downloadCvRes.arrayBuffer();
                console.log(`Kích thước file tải về: ${cvBuffer.byteLength} bytes (Gốc: ${pdfContent.length} bytes)`);

                if (downloadCvRes.status === 200 && cvBuffer.byteLength === pdfContent.length) {
                    console.log("=> BUG 01 ĐÃ ĐƯỢC KHẮC PHỤC HOÀN TOÀN (CV THẬT ĐƯỢC LƯU VÀ TẢI VỀ BẢO MẬT CHÍNH XÁC)!");
                } else {
                    console.error("=> BUG 01 THẤT BẠI! File CV không tải về được hoặc kích thước sai.");
                }
            } else {
                console.error("Không tìm thấy ứng viên vừa tạo trong danh sách candidates!");
            }
        } else {
            console.error("Nộp hồ sơ thất bại:", applyRes.status, applyData);
        }

        // Dọn dẹp file tạm
        try { fs.unlinkSync(tempPdfPath); } catch (e) {}
    }
}

main().catch(err => {
    console.error("LỖI CHẠY SCRIPT:", err);
    process.exit(1);
});
