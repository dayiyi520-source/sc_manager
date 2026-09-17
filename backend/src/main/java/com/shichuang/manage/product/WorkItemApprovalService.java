package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;

@Service
public class WorkItemApprovalService {
    private static final Logger LOG=LoggerFactory.getLogger(WorkItemApprovalService.class);
    private final WorkItemStorageService storage;
    private final WorkItemStorageMapper mapper;
    private final WorkItemConfigurationService configurations;
    public WorkItemApprovalService(WorkItemStorageService storage,WorkItemStorageMapper mapper,WorkItemConfigurationService configurations) {
        this.storage=storage; this.mapper=mapper; this.configurations=configurations;
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void dispatch(String line,Map<String,Object> requirement,ApprovalTasks tasks) {
        String tenant=RequestContext.tenantId(),id=requirement.get("id").toString(),user=RequestContext.userId();
        if (!"requirement".equals(requirement.get("category"))) throw new IllegalArgumentException("只有需求支持评审自动下发");
        if (mapper.approvalDispatched(tenant,line,id)) return;
        // Completion callbacks survive rollback and also cover failures after task creation.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status!=STATUS_COMMITTED) LOG.warn("REQUIREMENT_TASKS_DISPATCH_FAILED tenant={} productLine={} requirement={} outcome=rolled_back",tenant,line,id);
            }
        });
        Map<String,String> ids=new LinkedHashMap<>();
        String[] categories={"design","dev","test"};
        String[] types={tasks.designTypeId(),tasks.devTypeId(),tasks.testTypeId()};
        for (int i=0;i<categories.length;i++) {
            String kind=categories[i];
            String title=CATEGORIES.get(kind)+"："+requirement.get("title");
            if (title.length()>255) title=title.substring(0,254);
            String requestId=UUID.nameUUIDFromBytes((tenant+":"+line+":"+id+":"+kind).getBytes(StandardCharsets.UTF_8)).toString();
            var created=storage.create(new CreateItem(requestId,line,kind,types[i],title,null,null,
                Objects.toString(requirement.get("versionId"),null),id,null,null,
                requirement.get("priority").toString(),null,null,null,null));
            ids.put(kind,created.get("id").toString());
        }
        mapper.activity(tenant,line,id,"REQUIREMENT_TASKS_DISPATCHED",configurations.encode(ids),user);
    }
}
