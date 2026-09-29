package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Objects;

@Service
public class ProductLifecyclePolicy {
    private final ProductLineMapper productLines;
    private final ResearchStatusTemplateMapper statuses;

    public ProductLifecyclePolicy(ProductLineMapper productLines, ResearchStatusTemplateMapper statuses) {
        this.productLines = productLines;
        this.statuses = statuses;
    }

    public void requireMutable(String lineId) {
        Map<String, Object> line = productLines.lifecycle(RequestContext.tenantId(), lineId);
        if (line == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "产品不存在");
        if (line.get("archivedAt") != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "产品已归档，请先取消归档后再操作");
        String status = Objects.toString(line.get("status"), "");
        String phase = statuses.phaseForName(RequestContext.tenantId(), "PRODUCT", status);
        if ("已结束".equals(phase))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "产品已停用，请先启用后再操作");
    }
}
