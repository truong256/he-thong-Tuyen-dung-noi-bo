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
 * Active for all profiles except 'dev' and 'test'.
 */
@Service
@Profile("!dev & !test")
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

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        String subject = "[Tuyển dụng nội bộ] Yêu cầu đặt lại mật khẩu";
        String resetLink = "http://localhost:5173/reset-password?token=" + resetToken;
        String body = "<p>Kính gửi Quý nhân viên,</p>"
                + "<p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản tại Hệ thống Tuyển dụng Nội bộ.</p>"
                + "<p>Vui lòng truy cập liên kết sau để đặt lại mật khẩu của bạn:</p>"
                + "<p><a href=\"" + resetLink + "\">" + resetLink + "</a></p>"
                + "<p>Liên kết này có hiệu lực trong vòng 30 phút. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>"
                + "<p>Trân trọng,<br>Hệ thống Quản lý Tuyển dụng</p>";
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

    public void sendEmail(String toEmail, String subject, String bodyHtml) {
        logger.info("Initiating SMTP email transfer to {}:{}", host, port);
        try (Socket rawSocket = new Socket()) {
            rawSocket.connect(new InetSocketAddress(host, port), timeout);
            rawSocket.setSoTimeout(timeout);

            Socket socket = rawSocket;
            if (port == 465) {
                socket = ((SSLSocketFactory) SSLSocketFactory.getDefault())
                        .createSocket(rawSocket, host, port, true);
                ((SSLSocket) socket).startHandshake();
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            readResponse(reader, 220);
            sendCommand(writer, "EHLO " + getLocalHostName());
            readResponse(reader, 250);

            if (port != 465 && starttls) {
                sendCommand(writer, "STARTTLS");
                readResponse(reader, 220);
                SSLSocket sslSocket = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault())
                        .createSocket(socket, host, port, true);
                sslSocket.startHandshake();
                socket = sslSocket;
                reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

                sendCommand(writer, "EHLO " + getLocalHostName());
                readResponse(reader, 250);
            }

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
        } catch (Exception e) {
            logger.error("Failed to transmit email via SMTP to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Gửi email qua SMTP thất bại: " + e.getMessage(), e);
        }
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
