package com.shichuang.manage.product;

import java.util.List;

public final class VersionTestReportDefinition {
    private VersionTestReportDefinition() {}

    public record SaveReport(String name, List<String> testPlanIds, String summary, Integer revision) {}
}
