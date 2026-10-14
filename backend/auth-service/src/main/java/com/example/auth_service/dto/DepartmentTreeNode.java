package com.example.auth_service.dto;

import java.util.List;

public record DepartmentTreeNode(DepartmentResponse department, List<DepartmentTreeNode> children) {}
