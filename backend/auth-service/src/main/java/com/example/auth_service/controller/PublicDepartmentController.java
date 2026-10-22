package com.example.auth_service.controller;

import com.example.auth_service.repository.DepartmentRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicDepartmentController {
    private final DepartmentRepository departments;
    public PublicDepartmentController(DepartmentRepository departments) { this.departments = departments; }

    public record PublicDepartment(Long id, String name) {}

    @GetMapping("/api/public/departments")
    public List<PublicDepartment> list() {
        return departments.findPublicDepartments(LocalDate.now()).stream()
                .map(d -> new PublicDepartment(d.getId(), d.getName())).toList();
    }
}
