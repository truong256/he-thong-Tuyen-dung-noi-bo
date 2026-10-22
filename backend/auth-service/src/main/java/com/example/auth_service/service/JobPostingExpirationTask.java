package com.example.auth_service.service;

import com.example.auth_service.dto.AutoExpireResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * S4-08 / SCRUM-187: Tác vụ định kỳ tự động quét và ẩn/hết hạn các tin tuyển dụng quá hạn nhận hồ sơ.
 * Lịch chạy: Hằng ngày vào lúc 00:00:00 (múi giờ Asia/Ho_Chi_Minh).
 * Có thể cấu hình lại qua thuộc tính app.job-posting.expiry-cron.
 */
@Component
public class JobPostingExpirationTask {

    private static final Logger log = LoggerFactory.getLogger(JobPostingExpirationTask.class);

    private final JobPostingService jobPostingService;

    public JobPostingExpirationTask(JobPostingService jobPostingService) {
        this.jobPostingService = jobPostingService;
    }

    /**
     * Tác vụ định kỳ hằng ngày vào nửa đêm (00:00:00).
     */
    @Scheduled(cron = "${app.job-posting.expiry-cron:0 0 0 * * ?}", zone = "Asia/Ho_Chi_Minh")
    public void runDailyExpirationTask() {
        log.info("Bắt đầu tác vụ định kỳ tự động quét và hết hạn tin tuyển dụng quá hạn...");
        try {
            AutoExpireResult result = jobPostingService.expireDueJobPostings(LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
            log.info("Hoàn tất tác vụ tự động hết hạn tin tuyển dụng. Kết quả: {}", result.getMessage());
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình thực thi tác vụ tự động hết hạn tin tuyển dụng", e);
        }
    }
}
