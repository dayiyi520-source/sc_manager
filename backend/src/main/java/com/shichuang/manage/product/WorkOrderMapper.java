package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class WorkOrderMapper {
    private final JdbcTemplate jdbc;
    public WorkOrderMapper(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public List<Map<String,Object>> list(String tenantId,String taskType){return jdbc.queryForList(RequirementMapper.workItemSql()+" AND (?='' OR w.work_order_type_=?) ORDER BY w.create_time_ DESC",tenantId,taskType,taskType);}

    public List<Map<String,Object>> syncStatus(String tenantId,String taskType,String syncStatus,int size,int offset){
        if(!syncStatus.isBlank()&&!"SUCCESS".equals(syncStatus))return List.of();
        return jdbc.queryForList(RequirementMapper.workItemSql()+" AND (?='' OR w.work_order_type_=?) ORDER BY w.update_time_ DESC LIMIT ? OFFSET ?",tenantId,taskType,taskType,size,offset);
    }

    public long syncStatusCount(String tenantId,String taskType,String syncStatus){
        if(!syncStatus.isBlank()&&!"SUCCESS".equals(syncStatus))return 0;
        Long count=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item w JOIN t_product_work_item r ON r.id_=w.requirement_id_ AND r.tenant_id_=w.tenant_id_ AND r.category_='requirement' AND r.delete_flag_=0 WHERE w.tenant_id_=? AND w.delete_flag_=0 AND w.source_type_='WORK_ORDER' AND (?='' OR w.work_order_type_=?)",Long.class,tenantId,taskType,taskType);
        return count==null?0:count;
    }

    public Map<String,Object> find(String tenantId,String id){
        List<Map<String,Object>> rows=jdbc.queryForList("SELECT id_ AS id,product_line_id_ AS productLineId,requirement_id_ AS requirementId,work_order_type_ AS taskType,status_name_ AS status,status_group_ AS statusGroup,successful_ AS successful,progress_ AS progress,assignee_id_ AS assigneeId,assignee_name_ AS assigneeName,create_by_ AS creatorId,creator_name_ AS creatorName,assistance_owner_id_ AS assistanceOwnerId,COALESCE(assistance_initiator_id_,create_by_) AS assistanceInitiatorId,version_ AS revision FROM t_product_work_item WHERE id_=? AND tenant_id_=? AND source_type_='WORK_ORDER' AND delete_flag_=0",id,tenantId);
        if(rows.isEmpty())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"工作项不存在");
        return rows.get(0);
    }

    public List<Map<String,Object>> dueRetries(int limit){return List.of();}
    public int retryableFailures(String tenantId){return 0;}
    public int orphanCount(){Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item w LEFT JOIN t_product_work_item r ON r.id_=w.requirement_id_ AND r.tenant_id_=w.tenant_id_ AND r.category_='requirement' AND r.delete_flag_=0 WHERE w.delete_flag_=0 AND w.source_type_='WORK_ORDER' AND r.id_ IS NULL",Integer.class);return count==null?0:count;}
}
