package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;

@Service
public class WorkItemAccess {
    private final WorkItemStorageMapper storage;
    private final ProductLineMapper lines;
    private final UnifiedWorkItemMapper reads;
    public WorkItemAccess(WorkItemStorageMapper storage,ProductLineMapper lines,UnifiedWorkItemMapper reads) {
        this.storage=storage; this.lines=lines; this.reads=reads;
    }
    public void check(String line, boolean write) {
        String role=RequestContext.role();
        if (!(write?Set.of("admin","product_manager","tech_lead"):Set.of("admin","product_manager","tech_lead","product","tech")).contains(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"当前角色无权执行该产品操作");
        if (line == null || line.isBlank()) throw new IllegalArgumentException("产品线不能为空");
        String tenant=RequestContext.tenantId();
        if (write ? !storage.lockLine(tenant,line) : lines.find(tenant,line)==null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"产品线不存在");
        if (!"admin".equals(role) && !reads.canRead(tenant,line,RequestContext.userId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"当前用户无权访问该产品线");
    }
}
