package com.example.auth_service.security;

import com.example.auth_service.entity.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import java.util.ArrayList;
import java.util.List;

public final class CandidateScope {
    private CandidateScope() {}

    public static Specification<CandidateApplication> visibleTo(Authentication authentication) {
        return (root, query, cb) -> {
            if (authentication == null || !authentication.isAuthenticated()
                    || authentication instanceof AnonymousAuthenticationToken
                    || !(authentication.getPrincipal() instanceof UserPrincipal user)
                    || user.getId() == null || !user.isEnabled() || !user.isAccountNonLocked()) {
                return cb.disjunction();
            }
            var authorities = authentication.getAuthorities().stream().map(a -> a.getAuthority()).toList();
            if (authorities.contains(Permission.CANDIDATE_READ_ALL.name())) return cb.conjunction();
            List<Predicate> scopes = new ArrayList<>();
            if (authorities.contains(Permission.CANDIDATE_READ_OWN.name())) {
                scopes.add(cb.equal(root.get("candidateUserId"), user.getId()));
            }
            if (authorities.contains(Permission.CANDIDATE_READ_ASSIGNED.name())) {
                List<RoleName> assignedRoles = new ArrayList<>();
                for (RoleName role : List.of(RoleName.RECRUITER, RoleName.HIRING_MANAGER)) {
                    if (authorities.contains("ROLE_" + role.name())) assignedRoles.add(role);
                }
                if (!assignedRoles.isEmpty()) {
                    var assignmentQuery = query.subquery(Long.class);
                    var assignment = assignmentQuery.from(RequisitionAssignment.class);
                    assignmentQuery.select(assignment.get("id")).where(
                            cb.equal(assignment.get("requisitionId"), root.get("requisitionId")),
                            cb.equal(assignment.get("userId"), user.getId()),
                            assignment.get("role").in(assignedRoles));
                    scopes.add(cb.exists(assignmentQuery));
                }
                if (authorities.contains("ROLE_INTERVIEWER")) {
                    scopes.add(cb.equal(root.get("interviewerUserId"), user.getId()));
                }
            }
            return scopes.isEmpty() ? cb.disjunction() : cb.or(scopes.toArray(Predicate[]::new));
        };
    }
}
