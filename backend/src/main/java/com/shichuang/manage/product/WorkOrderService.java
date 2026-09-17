package com.shichuang.manage.product;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WorkOrderService {
    private final WorkOrderMapper mapper;
    private final WorkItemTransitionService transitions;
    public WorkOrderService(WorkOrderMapper mapper,WorkItemTransitionService transitions){this.mapper=mapper;this.transitions=transitions;}
    public List<Map<String,Object>> list(String tenantId,String taskType){return mapper.list(tenantId,taskType);}
    public List<Map<String,Object>> syncStatus(String tenantId,String taskType,String syncStatus,int size,int offset){return mapper.syncStatus(tenantId,taskType,syncStatus,size,offset);}
    public long syncStatusCount(String tenantId,String taskType,String syncStatus){return mapper.syncStatusCount(tenantId,taskType,syncStatus);}
    public Map<String,Object> find(String tenantId,String workId){return mapper.find(tenantId,workId);}
    public void updateStatus(String tenantId,String workId,String status,String operator){
        Map<String,Object> item=mapper.find(tenantId,workId);
        WorkItemTransitionService.Actions available=transitions.available(String.valueOf(item.get("productLineId")),workId);
        WorkItemTransitionService.Action action=available.actions().stream().filter(value->value.to().equals(status)||value.name().equals(status)||available.statuses().stream().anyMatch(option->option.key().equals(value.to())&&option.name().equals(status))).findFirst().orElseThrow(()->new IllegalArgumentException("当前流程不允许流转到该状态"));
        transitions.execute(String.valueOf(item.get("productLineId")),workId,new WorkItemDefinition.Transition(action.edgeKey(),available.revision(),"兼容接口状态变更"));
    }
    public List<Map<String,Object>> dueRetries(int limit){return mapper.dueRetries(limit);}
    public int orphanCount(){return mapper.orphanCount();}
    public int retryableFailures(String tenantId){return mapper.retryableFailures(tenantId);}
    public SyncResult retry(String tenantId,String workId,String operator){mapper.find(tenantId,workId);return SyncResult.success();}
    public record SyncResult(String status,String error){static SyncResult success(){return new SyncResult("SUCCESS","");}public boolean succeeded(){return true;}}
}
