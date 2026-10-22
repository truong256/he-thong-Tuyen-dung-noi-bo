package com.example.auth_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.*;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Production and default implementation of MailService using real SMTP protocol.
 * Also available in development by explicitly enabling the 'smtp' profile.
 * The 'test' profile always uses the simulated transport.
 */
@Service
@Profile("!test & (!dev | smtp)")
public class SmtpMailService implements MailService {

    private static final Logger logger = LoggerFactory.getLogger(SmtpMailService.class);

    @Value("${spring.mail.host:localhost}")
    private String host;

    @Value("${spring.mail.port:587}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${spring.mail.properties.mail.smtp.auth:false}")
    private boolean auth;

    @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}")
    private boolean starttls;

    @Value("${spring.mail.from:noreply@recruitment-system.com}")
    private String fromEmail;

    @Value("${spring.mail.properties.mail.smtp.timeout:10000}")
    private int timeout;

    @Value("${app.frontend-url:${APP_FRONTEND_URL:${FRONTEND_URL:http://localhost:5173}}}")
    private String frontendUrl = "http://localhost:5173";

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        sendPasswordResetEmail(toEmail, resetToken, "Quý người dùng");
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken, String recipientName) {
        String greetingName = (recipientName != null && !recipientName.isBlank()) ? recipientName.trim() : "Quý người dùng";
        String subject = "Đặt lại mật khẩu tài khoản tuyển dụng";
        String resetLink = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + resetToken;
        String body = "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;\">"
                + "<h2 style=\"color: #1e40af; margin-top: 0; font-size: 20px;\">Hệ thống Tuyển dụng Nội bộ</h2>"
                + "<p>Xin chào <strong>" + greetingName + "</strong>,</p>"
                + "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>"
                + "<div style=\"margin: 28px 0; text-align: left;\">"
                + "<a href=\"" + resetLink + "\" style=\"background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;\">Đặt lại mật khẩu</a>"
                + "</div>"
                + "<p style=\"color: #475569; font-size: 14px;\">Liên kết có hiệu lực trong <strong>30 phút</strong> và chỉ sử dụng được một lần.</p>"
                + "<p style=\"color: #64748b; font-size: 13px; margin-top: 16px;\">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>"
                + "<hr style=\"border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;\" />"
                + "<p style=\"color: #94a3b8; font-size: 12px; word-break: break-all;\">Nếu không bấm được vào nút trên, bạn có thể sao chép và dán liên kết sau vào trình duyệt:<br/><a href=\"" + resetLink + "\" style=\"color: #2563eb;\">" + resetLink + "</a></p>"
                + "</div>";
        sendEmail(toEmail, subject, body);
        logger.info("Sent password reset email via SMTP to {}", toEmail);
    }

    @Override
    public void sendAccountActivationEmail(String toEmail, String temporaryPassword) {
        String subject = "[Tuyển dụng nội bộ] Thông tin kích hoạt tài khoản nội bộ";
        String body = "<p>Kính gửi Quý nhân viên,</p>"
                + "<p>Tài khoản của bạn trên <strong>Hệ thống Tuyển dụng Nội bộ</strong> đã được khởi tạo thành công.</p>"
                + "<p><strong>Thông tin đăng nhập tạm thời:</strong></p>"
                + "<ul>"
                + "<li><strong>Email:</strong> " + toEmail + "</li>"
                + "<li><strong>Mật khẩu tạm thời:</strong> <code>" + temporaryPassword + "</code></li>"
                + "</ul>"
                + "<p>Vui lòng đăng nhập tại <a href=\"http://localhost:5173/login\">http://localhost:5173/login</a> "
                + "và đổi mật khẩu trong lần đầu tiên sử dụng để đảm bảo an toàn.</p>"
                + "<p>Trân trọng,<br>Hệ thống Quản lý Tuyển dụng</p>";
        sendEmail(toEmail, subject, body);
        // Requirement 5: DO NOT log temporary password
        logger.info("Sent account activation email via SMTP to {}", toEmail);
    }

    @Override
    public void sendApplicationConfirmationEmail(String toEmail, String candidateName, String jobTitle, String withdrawToken) {
        String greetingName = (candidateName != null && !candidateName.isBlank()) ? candidateName.trim() : "Quý ứng viên";
        String subject = "[Tuyển dụng nội bộ] Xác nhận nộp hồ sơ ứng tuyển - " + (jobTitle != null ? jobTitle : "Vị trí tuyển dụng");
        String withdrawLink = frontendUrl.replaceAll("/+$", "") + "/candidate/withdraw?token=" + withdrawToken;
        String body = "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;\">"
                + "<h2 style=\"color: #1e40af; margin-top: 0; font-size: 20px;\">Hệ thống Tuyển dụng Nội bộ</h2>"
                + "<p>Xin chào <strong>" + greetingName + "</strong>,</p>"
                + "<p>Hồ sơ ứng tuyển của bạn cho vị trí <strong>" + (jobTitle != null ? jobTitle : "") + "</strong> đã được tiếp nhận thành công trên hệ thống của chúng tôi.</p>"
                + "<p>Bộ phận Tuyển dụng sẽ xem xét hồ sơ và liên hệ với bạn trong thời gian sớm nhất.</p>"
                + "<div style=\"margin: 24px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #64748b; border-radius: 4px;\">"
                + "<p style=\"margin: 0; font-size: 14px; color: #475569;\"><strong>Lưu ý:</strong> Nếu bạn đã nhận việc tại nơi khác hoặc muốn dừng ứng tuyển, bạn có thể chủ động rút hồ sơ của mình bằng liên kết bên dưới:</p>"
                + "<p style=\"margin: 12px 0 0 0;\"><a href=\"" + withdrawLink + "\" style=\"color: #dc2626; font-weight: 600; text-decoration: underline;\">Bấm vào đây để yêu cầu rút hồ sơ ứng tuyển</a></p>"
                + "</div>"
                + "<p style=\"color: #64748b; font-size: 13px;\">Trân trọng,<br>Bộ phận Tuyển dụng</p>"
                + "</div>";
        sendEmail(toEmail, subject, body);
        logger.info("Sent application confirmation email with withdraw link via SMTP to {}", toEmail);
    }

    @Override
    public void sendCandidateWithdrawnNotification(String recruiterEmail, String candidateName, String jobTitle, Long applicationId) {
        String subject = "[Thông báo] Ứng viên rút hồ sơ: " + candidateName + " - " + jobTitle;
        String body = "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;\">"
                + "<h2 style=\"color: #dc2626; margin-top: 0; font-size: 20px;\">Thông báo ứng viên rút hồ sơ</h2>"
                + "<p>Kính gửi Chuyên viên tuyển dụng phụ trách,</p>"
                + "<p>Ứng viên <strong>" + candidateName + "</strong> (Mã hồ sơ: #" + applicationId + ") đã chủ động rút hồ sơ ứng tuyển cho vị trí <strong>" + jobTitle + "</strong>.</p>"
                + "<p>Hồ sơ đã được chuyển sang trạng thái <strong>Ứng viên rút</strong> và đưa ra khỏi pipeline đang hoạt động.</p>"
                + "<p>Vui lòng đăng nhập hệ thống để kiểm tra và cập nhật tiến độ tuyển dụng tương ứng.</p>"
                + "<p style=\"color: #64748b; font-size: 13px;\">Trân trọng,<br>Hệ thống Quản lý Tuyển dụng Nội bộ</p>"
                + "</div>";
        sendEmail(recruiterEmail, subject, body);
        logger.info("Sent candidate withdrawal notification email via SMTP to recruiter {}", recruiterEmail);
    }

    @SuppressWarnings("resource")
    public void sendEmail(String toEmail, String subject, String bodyHtml) {
        logger.info("Initiating SMTP email transfer to {}:{}", host, port);
        try (Socket rawSocket = new Socket()) {
            rawSocket.connect(new InetSocketAddress(host, port), timeout);
            rawSocket.setSoTimeout(timeout);

            Socket socket = rawSocket;
            SSLSocket sslSocket = null;
            if (port == 465) {
                sslSocket = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault())
                        .createSocket(rawSocket, host, port, true);
                sslSocket.startHandshake();
                socket = sslSocket;
            }

            try {
                BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

                readResponse(reader, 220);
                sendCommand(writer, "EHLO " + getLocalHostName());
                readResponse(reader, 250);

                if (port != 465 && starttls) {
                    sendCommand(writer, "STARTTLS");
                    readResponse(reader, 220);
                    try (SSLSocket tlsSocket = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault())
                            .createSocket(socket, host, port, true)) {
                        tlsSocket.startHandshake();
                        BufferedReader tlsReader = new BufferedReader(new InputStreamReader(tlsSocket.getInputStream(), StandardCharsets.UTF_8));
                        BufferedWriter tlsWriter = new BufferedWriter(new OutputStreamWriter(tlsSocket.getOutputStream(), StandardCharsets.UTF_8));

                        sendCommand(tlsWriter, "EHLO " + getLocalHostName());
                        readResponse(tlsReader, 250);

                        performSmtpTransaction(tlsReader, tlsWriter, toEmail, subject, bodyHtml);
                    }
                } else {
                    performSmtpTransaction(reader, writer, toEmail, subject, bodyHtml);
                }
            } finally {
                if (sslSocket != null) {
                    sslSocket.close();
                }
            }
        } catch (Exception e) {
            // SMTP responses can echo message contents. Never log server text or credentials.
            logger.error("Failed to transmit email via SMTP ({})", e.getClass().getSimpleName());
            throw new RuntimeException("Gửi email qua SMTP thất bại.");
        }
    }

    private void performSmtpTransaction(BufferedReader reader, BufferedWriter writer, String toEmail, String subject, String bodyHtml) throws IOException {
        if (auth && username != null && !username.isBlank()) {
            sendCommand(writer, "AUTH LOGIN");
            readResponse(reader, 334);
            sendCommand(writer, Base64.getEncoder().encodeToString(username.getBytes(StandardCharsets.UTF_8)));
            readResponse(reader, 334);
            sendCommand(writer, Base64.getEncoder().encodeToString((password != null ? password : "").getBytes(StandardCharsets.UTF_8)));
            readResponse(reader, 235);
        }

        sendCommand(writer, "MAIL FROM:<" + fromEmail + ">");
        readResponse(reader, 250);

        sendCommand(writer, "RCPT TO:<" + toEmail + ">");
        readResponse(reader, 250);

        sendCommand(writer, "DATA");
        readResponse(reader, 354);

        writer.write("From: " + fromEmail + "\r\n");
        writer.write("To: " + toEmail + "\r\n");
        writer.write("Subject: =?UTF-8?B?" + Base64.getEncoder().encodeToString(subject.getBytes(StandardCharsets.UTF_8)) + "?=\r\n");
        writer.write("MIME-Version: 1.0\r\n");
        writer.write("Content-Type: text/html; charset=UTF-8\r\n");
        writer.write("Content-Transfer-Encoding: 8bit\r\n");
        writer.write("\r\n");
        writer.write(bodyHtml);
        writer.write("\r\n.\r\n");
        writer.flush();
        readResponse(reader, 250);

        sendCommand(writer, "QUIT");
    }

    private void sendCommand(BufferedWriter writer, String command) throws IOException {
        writer.write(command + "\r\n");
        writer.flush();
    }

    private String readResponse(BufferedReader reader, int expectedCode) throws IOException {
        StringBuilder response = new StringBuilder();
        String line;
        int lastCode = -1;
        while ((line = reader.readLine()) != null) {
            response.append(line).append("\n");
            if (line.length() >= 3) {
                try {
                    lastCode = Integer.parseInt(line.substring(0, 3));
                } catch (NumberFormatException ignored) {}
            }
            if (line.length() < 4 || line.charAt(3) != '-') {
                break;
            }
        }
        if (lastCode != expectedCode) {
            throw new IOException("Expected SMTP response code " + expectedCode + " but received: " + response.toString().trim());
        }
        return response.toString();
    }

    private String getLocalHostName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "localhost";
        }
    }

    String getHost() { return host; }
    void setHost(String host) { this.host = host; }
    int getPort() { return port; }
    void setPort(int port) { this.port = port; }
    void setFromEmail(String fromEmail) { this.fromEmail = fromEmail; }
    void setTimeout(int timeout) { this.timeout = timeout; }
}
