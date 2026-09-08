package com.shichuang.manage.product;

import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
@Profile("local")
public class WorkOrderRetryScheduler {
    private static final Logger log = LoggerFactory.getLogger(WorkOrderRetryScheduler.class);
    private final WorkOrderService service;

    public WorkOrderRetryScheduler(WorkOrderService service) { this.service = service; }

    @Scheduled(initialDelayString = "${string.requirement.sync.initial-delay-ms:60000}", fixedDelayString = "${string.requirement.sync.interval-ms:60000}")
    public void retryDueWorkItems() {
        for (var item : service.dueRetries(20)) {
            service.retry(String.valueOf(item.get("tenantId")), String.valueOf(item.get("id")), "system-retry");
        }
        int orphanCount = service.orphanCount();
        if (orphanCount > 0) log.warn("发现 {} 条来源需求已不存在的工单，请人工核查", orphanCount);
    }
}
