package com.shichuang.manage.product;

public enum AssistanceStatus {
    PENDING_ACCEPTANCE("待受理"), PROCESSING("处理中"), PENDING_REVIEW("待验收"), ACCEPTANCE_FAILED("验收未通过"), PENDING_OWNER_CLOSE("待负责人关闭"), CLOSED("已关闭"), ON_HOLD("已搁置"), REJECTED("已驳回");
    private final String label;
    AssistanceStatus(String label) { this.label = label; }
    public String label() { return label; }
    public boolean isTerminal() { return this == CLOSED || this == REJECTED; }
    public boolean canReopen() { return this == CLOSED || this == REJECTED || this == ON_HOLD; }
    public static AssistanceStatus from(String value) {
        for (AssistanceStatus status : values()) if (status.label.equals(value) || status.name().equals(value)) return status;
        return PROCESSING;
    }
}
