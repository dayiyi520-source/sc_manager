package com.shichuang.manage.product;

public enum AssistanceStatus {
    PENDING("待处理"), PROCESSING("处理中"), PENDING_REVIEW("待验收"), PENDING_CLOSE("待关闭"), CLOSED("已关闭"), ON_HOLD("已搁置"), REJECTED("已驳回");
    private final String label;
    AssistanceStatus(String label) { this.label = label; }
    public String label() { return label; }
    public boolean isTerminal() { return this == CLOSED || this == REJECTED; }
    public boolean canReopen() { return this == CLOSED || this == REJECTED || this == ON_HOLD; }
    public static AssistanceStatus from(String value) {
        if ("待受理".equals(value)) return PENDING;
        if ("验收未通过".equals(value)) return PROCESSING;
        if ("待负责人关闭".equals(value)) return PENDING_CLOSE;
        if ("已完成".equals(value)) return CLOSED;
        for (AssistanceStatus status : values()) if (status.label.equals(value) || status.name().equals(value)) return status;
        return PROCESSING;
    }
}
