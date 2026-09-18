package com.shichuang.manage.product;

import java.time.LocalDate;
import java.util.List;

public final class TestExecutionDefinition {
    private TestExecutionDefinition() {}
    public enum ScopeType { ALL, FAILED_ONLY, CUSTOM }
    public enum ExecutionStatus { IN_PROGRESS, ENDED, CANCELLED }
    public enum ResultStatus { NOT_EXECUTED, PASSED, FAILED }
    public record SavePlan(List<String> testCaseIds,String name,String environment,LocalDate startDate,LocalDate endDate,Integer revision) {}
    public record CreateExecution(String requestId,String planId,ScopeType scopeType,List<String> testCaseIds,String name,String environment,String buildVersion) {}
    public record EvidenceInput(String name,String contentType,long size,String dataUrl) {}
    public record SaveResult(ResultStatus result,String actualResult,List<EvidenceInput> evidence,Integer revision) {}
    public record LinkDefect(String defectWorkItemId,Integer revision) {}
}
