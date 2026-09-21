package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class WorkItemStorageMapper {
    private final JdbcTemplate jdbc;
    public WorkItemStorageMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private Map<String,Object> one(String sql, Object... args) {
        List<Map<String,Object>> rows = jdbc.queryForList(sql, args);
        return rows.isEmpty() ? null : rows.get(0);
    }
    public boolean lockLine(String tenant, String line) {
        return one("SELECT id_ FROM t_product_line WHERE tenant_id_=? AND id_=? AND delete_flag_=0 FOR UPDATE",tenant,line) != null;
    }
    public Map<String,Object> type(String tenant, String line, String id) {
        return one("SELECT id_ AS id,category_ AS category,enabled_ AS enabled FROM t_product_line_work_item_type WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",tenant,line,id);
    }
    public Map<String,Object> defaultType(String tenant,String line,String category) {
        return one("SELECT id_ AS id FROM t_product_line_work_item_type WHERE tenant_id_=? AND product_line_id_=? AND category_=? AND enabled_=1 AND delete_flag_=0 ORDER BY is_default_ DESC,create_time_,id_ LIMIT 1",tenant,line,category);
    }
    private static final String WORKFLOW = "SELECT id_ AS id,category_ AS category,task_type_id_ AS taskTypeId,name_ AS name,workflow_version_ AS workflowVersion,status_ AS status,definition_ AS definition,version_ AS revision FROM t_product_workflow WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0";
    public List<Map<String,Object>> workflows(String tenant,String line) { return jdbc.queryForList(WORKFLOW+" ORDER BY category_,workflow_version_ DESC",tenant,line); }
    public List<Map<String,Object>> workflows(String tenant,String line,String taskTypeId) { return jdbc.queryForList(WORKFLOW+" AND task_type_id_=? ORDER BY workflow_version_ DESC",tenant,line,taskTypeId); }
    public Map<String,Object> workflow(String tenant,String line,String id) { return one(WORKFLOW+" AND id_=?",tenant,line,id); }
    public Map<String,Object> publishedWorkflow(String tenant,String line,String category) { return one(WORKFLOW+" AND category_=? AND task_type_id_ IS NULL AND status_='PUBLISHED' ORDER BY workflow_version_ DESC LIMIT 1",tenant,line,category); }
    public Map<String,Object> publishedWorkflow(String tenant,String line,String category,String taskTypeId) {
        Map<String,Object> scoped=one(WORKFLOW+" AND category_=? AND task_type_id_=? AND status_='PUBLISHED' ORDER BY workflow_version_ DESC LIMIT 1",tenant,line,category,taskTypeId);
        return scoped!=null?scoped:publishedWorkflow(tenant,line,category);
    }
    public void insertWorkflow(String tenant,String line,String id,String category,String taskTypeId,String name,String definition,String user) {
        Integer next = jdbc.queryForObject("SELECT COALESCE(MAX(workflow_version_),0)+1 FROM t_product_workflow WHERE tenant_id_=? AND product_line_id_=? AND category_=? AND ((? IS NULL AND task_type_id_ IS NULL) OR task_type_id_=?)",Integer.class,tenant,line,category,taskTypeId,taskTypeId);
        jdbc.update("INSERT INTO t_product_workflow(id_,tenant_id_,product_line_id_,category_,task_type_id_,workflow_version_,name_,definition_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(6),NOW(6))",id,tenant,line,category,taskTypeId,next,name,definition,user,user);
    }
    public int updateWorkflow(String tenant,String line,String id,int revision,String name,String definition,String user) {
        return jdbc.update("UPDATE t_product_workflow SET name_=?,definition_=CAST(? AS JSON),version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND status_='DRAFT' AND delete_flag_=0",name,definition,user,tenant,line,id,revision);
    }
    public int publish(String tenant,String line,String id,int revision,String user) {
        return jdbc.update("UPDATE t_product_workflow SET status_='PUBLISHED',version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND status_='DRAFT' AND delete_flag_=0",user,tenant,line,id,revision);
    }
    public int migrateNotStarted(String tenant,String line,String category,String taskTypeId,String workflowId,WorkItemDefinition.State initial,String user) {
        return jdbc.update("""
            UPDATE t_product_work_item SET workflow_id_=?,status_key_=?,status_name_=?,status_group_=?,status_color_=?,successful_=? ,
              version_=version_+1,update_by_= ?,update_time_=NOW(6)
            WHERE tenant_id_=? AND product_line_id_=? AND category_=?
              AND ((? IS NULL AND task_type_id_ IS NULL) OR task_type_id_=?)
              AND status_group_='NOT_STARTED' AND delete_flag_=0
            """,workflowId,initial.key(),initial.name(),initial.group().name(),initial.color(),initial.successful(),user,tenant,line,category,taskTypeId,taskTypeId);
    }
    public List<Map<String,Object>> childRules(String tenant,String line) {
        return jdbc.queryForList("SELECT id_ AS id,parent_type_id_ AS parentTypeId,child_type_id_ AS childTypeId,enabled_ AS enabled,version_ AS revision FROM t_product_work_item_child_rule WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0 ORDER BY create_time_,id_",tenant,line);
    }
    public void childRule(String tenant,String line,String parent,String child,boolean enabled,String user) {
        jdbc.update("INSERT INTO t_product_work_item_child_rule(id_,tenant_id_,product_line_id_,parent_type_id_,child_type_id_,enabled_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(6),NOW(6)) ON DUPLICATE KEY UPDATE enabled_=VALUES(enabled_),version_=version_+1,update_by_=VALUES(update_by_),update_time_=NOW(6)",UUID.randomUUID().toString(),tenant,line,parent,child,enabled,user,user);
    }
    public boolean childAllowed(String tenant,String line,String parent,String child) {
        return one("SELECT id_ FROM t_product_work_item_child_rule WHERE tenant_id_=? AND product_line_id_=? AND parent_type_id_=? AND child_type_id_=? AND enabled_=1 AND delete_flag_=0",tenant,line,parent,child) != null;
    }
    private static final String ITEM = "SELECT w.id_ AS id,w.code_ AS code,w.product_line_id_ AS productLineId,w.category_ AS category,w.task_type_id_ AS taskTypeId,w.title_ AS title,w.description_ AS description,w.description_html_ AS descriptionHtml,w.expected_goal_ AS expectedGoal,w.version_id_ AS versionId,w.requirement_id_ AS requirementId,w.parent_work_item_id_ AS parentWorkItemId,w.workflow_id_ AS workflowId,w.status_key_ AS statusKey,w.status_name_ AS statusName,w.status_group_ AS statusGroup,w.status_color_ AS statusColor,w.successful_ AS successful,w.assignee_id_ AS assigneeId,w.assignee_name_ AS assigneeName,w.priority_ AS priority,w.planned_start_date_ AS plannedStartDate,w.planned_end_date_ AS plannedEndDate,w.estimated_hours_ AS estimatedHours,w.actual_hours_ AS actualHours,w.version_ AS revision,w.create_time_ AS createdAt,EXISTS(SELECT 1 FROM t_product_work_item child WHERE child.tenant_id_=w.tenant_id_ AND child.product_line_id_=w.product_line_id_ AND child.parent_work_item_id_=w.id_ AND child.delete_flag_=0) AS hasChildren FROM t_product_work_item w WHERE w.tenant_id_=? AND w.product_line_id_=? AND w.delete_flag_=0";
    public Map<String,Object> item(String tenant,String line,String id) { return one(ITEM+" AND id_=?",tenant,line,id); }
    public Map<String,Object> timedItem(String tenant,String line,String id) {
        Map<String,Object> item = item(tenant,line,id);
        if (item != null) {
            item.putAll(one("SELECT source_type_ AS sourceType,actual_start_at_ AS actualStartAt,completed_at_ AS completedAt FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",tenant,line,id));
            item.put("children", jdbc.queryForList(ITEM + " AND parent_work_item_id_=? ORDER BY create_time_,id_", tenant, line, id));
            if(item.get("parentWorkItemId")!=null) item.put("parent",item(tenant,line,item.get("parentWorkItemId").toString()));
        }
        return item;
    }
    public boolean hasChildren(String tenant,String line,String id) {
        return one("SELECT id_ FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND parent_work_item_id_=? AND delete_flag_=0 LIMIT 1",tenant,line,id)!=null;
    }
    public int softDelete(String tenant,String line,String id,int revision,String user) {
        return jdbc.update("UPDATE t_product_work_item SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=0",user,tenant,line,id,revision);
    }
    public boolean hasUnfinishedChildren(String tenant,String line,String id) {
        return one("SELECT id_ FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND parent_work_item_id_=? AND delete_flag_=0 AND successful_=0 LIMIT 1",tenant,line,id)!=null;
    }
    public boolean approvalDispatched(String tenant,String line,String id) {
        return one("SELECT id_ FROM t_product_work_item_activity WHERE tenant_id_=? AND product_line_id_=? AND subject_id_=? AND event_type_='REQUIREMENT_TASKS_DISPATCHED' LIMIT 1",tenant,line,id)!=null;
    }
    public int transition(String tenant,String line,String id,int revision,String from,WorkItemDefinition.State to,String user) {
        boolean terminal=to.group()==WorkItemStatus.Group.COMPLETED || to.group()==WorkItemStatus.Group.CANCELLED;
        return jdbc.update("""
            UPDATE t_product_work_item SET status_key_=?,status_name_=?,status_group_=?,status_color_=?,successful_=?,
              actual_start_at_=CASE WHEN ?='IN_PROGRESS' THEN COALESCE(actual_start_at_,NOW(6)) ELSE actual_start_at_ END,
              completed_at_=CASE WHEN ? THEN NOW(6) ELSE NULL END,
              version_=version_+1,update_by_=?,update_time_=NOW(6)
            WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND status_key_=? AND delete_flag_=0
            """,to.key(),to.name(),to.group().name(),to.color(),to.successful(),to.group().name(),terminal,user,tenant,line,id,revision,from);
    }
    public Map<String,Object> request(String tenant,String line,String requestId) {
        return one("SELECT id_ AS id,request_hash_ AS requestHash,create_by_ AS creatorId FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND request_id_=? AND delete_flag_=0",tenant,line,requestId);
    }
    public Map<String,Object> version(String tenant,String line,String id) {
        return one("SELECT id_ AS id,status_ AS status FROM t_product_line_version WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0 FOR UPDATE",tenant,line,id);
    }
    public String assignee(String tenant,String userId) {
        Map<String,Object> user = one("SELECT name_ AS name FROM t_sys_user WHERE tenant_id_=? AND id_=? AND delete_flag_=0 AND status_='enabled'",tenant,userId);
        return user == null ? null : Objects.toString(user.get("name"),"");
    }
    public Map<String,Object> assigneeByName(String tenant,String name) {
        return one("SELECT id_ AS id,name_ AS name FROM t_sys_user WHERE tenant_id_=? AND name_=? AND delete_flag_=0 AND status_='enabled' ORDER BY create_time_ LIMIT 1",tenant,name);
    }
    public int updateItem(String tenant,String line,String id,WorkItemDefinition.UpdateItem input,String versionId,
        String assigneeId,String assigneeName,String user) {
        return jdbc.update("""
            UPDATE t_product_work_item SET
              title_=COALESCE(?,title_),description_=COALESCE(?,description_),description_html_=COALESCE(?,description_html_),expected_goal_=COALESCE(?,expected_goal_),
              version_id_=COALESCE(?,version_id_),assignee_id_=CASE WHEN ? THEN ? ELSE assignee_id_ END,
              assignee_name_=CASE WHEN ? THEN ? ELSE assignee_name_ END,priority_=COALESCE(?,priority_),
              planned_start_date_=COALESCE(?,planned_start_date_),planned_end_date_=COALESCE(?,planned_end_date_),
              estimated_hours_=COALESCE(?,estimated_hours_),actual_hours_=COALESCE(?,actual_hours_),
              version_=version_+1,update_by_=?,update_time_=NOW(6)
            WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=0
            """,input.title()==null?null:input.title().trim(),input.description(),input.descriptionHtml(),input.expectedGoal(),versionId,
            input.assigneeName()!=null,assigneeId,input.assigneeName()!=null,assigneeName,input.priority(),input.plannedStartDate(),
            input.plannedEndDate(),input.estimatedHours(),input.actualHours(),user,tenant,line,id,input.revision());
    }
    public void insertItem(String tenant,String id,String code,WorkItemDefinition.CreateItem input,String versionId,String requirementId,
        String parentId,String assigneeName,String workflowId,WorkItemDefinition.State initial,String hash,String user) {
        jdbc.update("""
            INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,description_,description_html_,expected_goal_,
              version_id_,requirement_id_,parent_work_item_id_,workflow_id_,status_key_,status_name_,status_group_,status_color_,successful_,assignee_id_,assignee_name_,
              priority_,planned_start_date_,planned_end_date_,estimated_hours_,actual_hours_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))
            """,id,tenant,input.productLineId(),input.category(),input.taskTypeId(),code,input.title().trim(),input.description(),input.descriptionHtml(),input.expectedGoal(),
            versionId,requirementId,parentId,workflowId,initial.key(),initial.name(),initial.group().name(),initial.color(),initial.successful(),
            WorkItemDefinition.optional(input.assigneeId()),assigneeName,input.priority(),input.plannedStartDate(),input.plannedEndDate(),
            input.estimatedHours()==null?java.math.BigDecimal.ZERO:input.estimatedHours(),
            input.actualHours()==null?java.math.BigDecimal.ZERO:input.actualHours(),input.requestId(),hash,user,user);
    }
    public void activity(String tenant,String line,String subject,String event,String json,String user) {
        jdbc.update("INSERT INTO t_product_work_item_activity(id_,tenant_id_,product_line_id_,subject_id_,event_type_,content_,create_by_,create_time_) VALUES(?,?,?,?,?,CAST(? AS JSON),?,NOW(6))",UUID.randomUUID().toString(),tenant,line,subject,event,json,user);
    }
    public List<Map<String,Object>> activities(String tenant,String line,String id) {
        return jdbc.queryForList("SELECT id_ AS id,event_type_ AS eventType,content_ AS content,create_by_ AS operatorId,create_time_ AS createdAt FROM t_product_work_item_activity WHERE tenant_id_=? AND product_line_id_=? AND subject_id_=? ORDER BY create_time_ DESC,id_ LIMIT 200",tenant,line,id);
    }
}
