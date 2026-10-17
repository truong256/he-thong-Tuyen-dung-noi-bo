package com.example.auth_service.exception;

import com.example.auth_service.dto.budget.BudgetEvaluationResponse;
import lombok.Getter;

@Getter
public class BudgetExceededException extends RuntimeException {
    private final String errorCode;
    private final boolean canOverride;
    private final BudgetEvaluationResponse evaluation;

    public BudgetExceededException(String errorCode, String message, boolean canOverride, BudgetEvaluationResponse evaluation) {
        super(message);
        this.errorCode = errorCode;
        this.canOverride = canOverride;
        this.evaluation = evaluation;
    }
}
