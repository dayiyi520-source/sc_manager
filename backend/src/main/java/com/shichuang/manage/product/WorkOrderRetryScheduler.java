package com.shichuang.manage.product;

import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class WorkOrderRetryScheduler {
    private final WorkOrderService service;

    public WorkOrderRetryScheduler(WorkOrderService service) { this.service = service; }

    @Scheduled(initialDelayString = "${string.requirement.sync.initial-delay-ms:60000}", fixedDelayString = "${string.requirement.sync.interval-ms:60000}")
    public void retryDueWorkItems() {
        for (var item : service.dueRetries(20)) {
            service.retry(String.valueOf(item.get("tenantId")), String.valueOf(item.get("id")), "system-retry");
        }
    }
}
