INSERT INTO roles (name, description) VALUES
    ('CANDIDATE', 'Ứng viên ứng tuyển'),
    ('RECRUITER', 'Chuyên viên tuyển dụng'),
    ('HIRING_MANAGER', 'Quản lý tuyển dụng'),
    ('INTERVIEWER', 'Người phỏng vấn'),
    ('HR_MANAGER', 'Trưởng phòng nhân sự'),
    ('APPROVER', 'Người phê duyệt'),
    ('ADMIN', 'Quản trị viên hệ thống')
ON CONFLICT (name) DO NOTHING;
