package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class TestExecutionMapper {
    private final JdbcTemplate jdbc;
    public TestExecutionMapper(JdbcTemplate jdbc){this.jdbc=jdbc;}
    private Map<String,Object> one(String sql,Object...args){List<Map<String,Object>>r=jdbc.queryForList(sql,args);return r.isEmpty()?null:r.get(0);}
    public Map<String,Object> item(String tenant,String id){return one("""
      SELECT w.id_ AS id,w.product_line_id_ AS productLineId,w.category_ AS category,w.task_type_id_ AS taskTypeId,
        t.name_ AS taskTypeName,w.requirement_id_ AS requirementId,w.version_id_ AS versionId,w.parent_work_item_id_ AS parentWorkItemId,
        w.title_ AS title,w.status_name_ AS statusName,w.successful_ AS successful,w.priority_ AS priority,w.assignee_id_ AS assigneeId,
        w.assignee_name_ AS assigneeName,w.estimated_hours_ AS estimatedHours,w.actual_hours_ AS actualHours,w.version_ AS revision
      FROM t_product_work_item w LEFT JOIN t_product_line_work_item_type t ON t.tenant_id_=w.tenant_id_ AND t.product_line_id_=w.product_line_id_ AND t.id_=w.task_type_id_ AND t.delete_flag_=0
      WHERE w.tenant_id_=? AND w.id_=? AND w.delete_flag_=0
      """,tenant,id);}
    private static final String PLAN_FIELDS="id_ AS id,product_line_id_ AS productLineId,work_item_id_ AS workItemId,requirement_id_ AS requirementId,version_id_ AS versionId,name_ AS name,environment_ AS environment,start_date_ AS startDate,end_date_ AS endDate,version_ AS revision,create_time_ AS createdAt,update_time_ AS updatedAt";
    public List<Map<String,Object>> plans(String tenant,String workItem){return jdbc.queryForList("SELECT "+PLAN_FIELDS+" FROM t_product_test_plan WHERE tenant_id_=? AND work_item_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC,id_",tenant,workItem);}
    public Map<String,Object> plan(String tenant,String workItem){return one("SELECT "+PLAN_FIELDS+" FROM t_product_test_plan WHERE tenant_id_=? AND work_item_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC,id_ LIMIT 1",tenant,workItem);}
    public Map<String,Object> plan(String tenant,String workItem,String planId){return one("SELECT "+PLAN_FIELDS+" FROM t_product_test_plan WHERE tenant_id_=? AND work_item_id_=? AND id_=? AND delete_flag_=0",tenant,workItem,planId);}
    public void insertPlan(String tenant,String id,Map<String,Object> item,String name,String environment,java.time.LocalDate startDate,java.time.LocalDate endDate,String user){jdbc.update("INSERT INTO t_product_test_plan(id_,tenant_id_,product_line_id_,work_item_id_,requirement_id_,version_id_,name_,environment_,start_date_,end_date_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))",id,tenant,item.get("productLineId"),item.get("id"),item.get("requirementId"),item.get("versionId"),name,environment,startDate,endDate,user,user);}
    public int updatePlan(String tenant,String id,int revision,String name,String environment,java.time.LocalDate startDate,java.time.LocalDate endDate,String user){return jdbc.update("UPDATE t_product_test_plan SET name_=?,environment_=?,start_date_=?,end_date_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0",name,environment,startDate,endDate,user,tenant,id,revision);}
    public List<Map<String,Object>> planCases(String tenant,String plan){return jdbc.queryForList("""
      SELECT pc.id_ AS linkId,pc.test_case_id_ AS testCaseId,pc.sort_ AS sort,c.code_ AS code,c.title_ AS title,c.precondition_ AS precondition,c.priority_ AS priority,c.owner_name_ AS ownerName,c.enabled_ AS enabled,
        (SELECT ec.result_ FROM t_product_test_execution_case ec JOIN t_product_test_execution e ON e.tenant_id_=ec.tenant_id_ AND e.id_=ec.execution_id_ AND e.delete_flag_=0 WHERE ec.tenant_id_=pc.tenant_id_ AND ec.test_case_id_=pc.test_case_id_ AND e.test_plan_id_=pc.test_plan_id_ AND ec.delete_flag_=0 ORDER BY e.round_no_ DESC LIMIT 1) AS latestResult
      FROM t_product_test_plan_case pc JOIN t_product_test_case c ON c.tenant_id_=pc.tenant_id_ AND c.id_=pc.test_case_id_ AND c.delete_flag_=0
      WHERE pc.tenant_id_=? AND pc.test_plan_id_=? AND pc.delete_flag_=0 ORDER BY pc.sort_,pc.id_
      """,tenant,plan);}
    public void replacePlanCases(String tenant,String plan,List<String> ids,String user){
        jdbc.update("UPDATE t_product_test_plan_case SET delete_flag_=1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND test_plan_id_=? AND delete_flag_=0",user,tenant,plan);
        for(int i=0;i<ids.size();i++)jdbc.update("INSERT INTO t_product_test_plan_case(id_,tenant_id_,test_plan_id_,test_case_id_,sort_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,NOW(6),NOW(6))",UUID.randomUUID().toString(),tenant,plan,ids.get(i),i+1,user,user);
    }
    public Map<String,Object> testCase(String tenant,String line,String id){return one("SELECT id_ AS id,code_ AS code,title_ AS title,precondition_ AS precondition,priority_ AS priority,enabled_ AS enabled FROM t_product_test_case WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",tenant,line,id);}
    public List<Map<String,Object>> testCaseSteps(String tenant,String id){return jdbc.queryForList("SELECT sort_ AS sort,action_ AS action,expected_result_ AS expectedResult FROM t_product_test_case_step WHERE tenant_id_=? AND test_case_id_=? AND delete_flag_=0 ORDER BY sort_",tenant,id);}
    public Map<String,Object> executionRequest(String tenant,String workItem,String request){return one("SELECT id_ AS id,request_hash_ AS requestHash FROM t_product_test_execution WHERE tenant_id_=? AND work_item_id_=? AND request_id_=? AND delete_flag_=0",tenant,workItem,request);}
    public int nextRound(String tenant,String plan){Integer n=jdbc.queryForObject("SELECT COALESCE(MAX(round_no_),0)+1 FROM t_product_test_execution WHERE tenant_id_=? AND test_plan_id_=? AND delete_flag_=0",Integer.class,tenant,plan);return n==null?1:n;}
    public void insertExecution(String tenant,String id,String plan,String workItem,String line,int round,String name,String scope,String environment,String build,String executorId,String executorName,String request,String hash,String user){jdbc.update("""
      INSERT INTO t_product_test_execution(id_,tenant_id_,product_line_id_,test_plan_id_,work_item_id_,round_no_,name_,scope_type_,environment_,build_version_,executor_id_,executor_name_,status_,request_id_,request_hash_,start_time_,create_by_,update_by_,create_time_,update_time_)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?, 'IN_PROGRESS',?,?,NOW(6),?,?,NOW(6),NOW(6))
      """,id,tenant,line,plan,workItem,round,name,scope,environment,build,executorId,executorName,request,hash,user,user);}
    public void insertExecutionCase(String tenant,String id,String execution,Map<String,Object> c,int sort,String steps,String user){jdbc.update("""
      INSERT INTO t_product_test_execution_case(id_,tenant_id_,execution_id_,test_case_id_,sort_,code_snapshot_,title_snapshot_,precondition_snapshot_,priority_snapshot_,steps_snapshot_,result_,create_by_,update_by_,create_time_,update_time_)
      VALUES(?,?,?,?,?,?,?,?,?,?, 'NOT_EXECUTED',?,?,NOW(6),NOW(6))
      """,id,tenant,execution,c.get("id"),sort,c.get("code"),c.get("title"),c.get("precondition"),c.get("priority"),steps,user,user);}
    public List<Map<String,Object>> executions(String tenant,String workItem){return jdbc.queryForList("""
      SELECT e.id_ AS id,e.test_plan_id_ AS testPlanId,p.name_ AS planName,e.round_no_ AS roundNo,e.name_ AS name,e.scope_type_ AS scopeType,e.environment_ AS environment,e.build_version_ AS buildVersion,e.executor_id_ AS executorId,e.executor_name_ AS executorName,e.status_ AS status,e.start_time_ AS startTime,e.end_time_ AS endTime,e.version_ AS revision,
        COUNT(ec.id_) AS total,SUM(ec.result_='PASSED') AS passed,SUM(ec.result_='FAILED') AS failed,SUM(ec.result_='NOT_EXECUTED') AS notExecuted
      FROM t_product_test_execution e JOIN t_product_test_plan p ON p.tenant_id_=e.tenant_id_ AND p.id_=e.test_plan_id_ AND p.delete_flag_=0 LEFT JOIN t_product_test_execution_case ec ON ec.tenant_id_=e.tenant_id_ AND ec.execution_id_=e.id_ AND ec.delete_flag_=0
      WHERE e.tenant_id_=? AND e.work_item_id_=? AND e.delete_flag_=0 GROUP BY e.id_ ORDER BY e.round_no_ DESC
      """,tenant,workItem);}
    public Map<String,Object> latestEndedExecution(String tenant,String workItem){return one("""
      SELECT e.id_ AS id,e.round_no_ AS roundNo,e.name_ AS name,e.scope_type_ AS scopeType,e.environment_ AS environment,e.build_version_ AS buildVersion,e.executor_id_ AS executorId,e.executor_name_ AS executorName,e.status_ AS status,e.start_time_ AS startTime,e.end_time_ AS endTime,e.version_ AS revision,
        COUNT(ec.id_) AS total,SUM(ec.result_='PASSED') AS passed,SUM(ec.result_='FAILED') AS failed,SUM(ec.result_='NOT_EXECUTED') AS notExecuted
      FROM t_product_test_execution e LEFT JOIN t_product_test_execution_case ec ON ec.tenant_id_=e.tenant_id_ AND ec.execution_id_=e.id_ AND ec.delete_flag_=0
      WHERE e.tenant_id_=? AND e.work_item_id_=? AND e.status_='ENDED' AND e.delete_flag_=0
      GROUP BY e.id_ ORDER BY e.round_no_ DESC LIMIT 1
      """,tenant,workItem);}
    public Map<String,Object> execution(String tenant,String id){return one("SELECT id_ AS id,product_line_id_ AS productLineId,test_plan_id_ AS testPlanId,work_item_id_ AS workItemId,round_no_ AS roundNo,name_ AS name,scope_type_ AS scopeType,environment_ AS environment,build_version_ AS buildVersion,executor_name_ AS executorName,status_ AS status,start_time_ AS startTime,end_time_ AS endTime,version_ AS revision FROM t_product_test_execution WHERE tenant_id_=? AND id_=? AND delete_flag_=0",tenant,id);}
    public List<Map<String,Object>> executionCases(String tenant,String execution){return jdbc.queryForList("""
      SELECT ec.id_ AS id,ec.test_case_id_ AS testCaseId,ec.sort_ AS sort,ec.code_snapshot_ AS code,ec.title_snapshot_ AS title,ec.precondition_snapshot_ AS precondition,ec.priority_snapshot_ AS priority,ec.steps_snapshot_ AS steps,ec.result_ AS result,ec.actual_result_ AS actualResult,ec.executor_name_ AS executorName,ec.executed_at_ AS executedAt,ec.version_ AS revision
      FROM t_product_test_execution_case ec WHERE ec.tenant_id_=? AND ec.execution_id_=? AND ec.delete_flag_=0 ORDER BY ec.sort_,ec.id_
      """,tenant,execution);}
    public Map<String,Object> result(String tenant,String id){return one("""
      SELECT ec.id_ AS id,ec.execution_id_ AS executionId,ec.test_case_id_ AS testCaseId,ec.result_ AS result,ec.version_ AS revision,e.product_line_id_ AS productLineId,e.work_item_id_ AS workItemId,e.status_ AS executionStatus
      FROM t_product_test_execution_case ec JOIN t_product_test_execution e ON e.tenant_id_=ec.tenant_id_ AND e.id_=ec.execution_id_ AND e.delete_flag_=0
      WHERE ec.tenant_id_=? AND ec.id_=? AND ec.delete_flag_=0
      """,tenant,id);}
    public int updateResult(String tenant,String id,int revision,String result,String actual,String executorId,String executorName,String user){return jdbc.update("UPDATE t_product_test_execution_case SET result_=?,actual_result_=?,executor_id_=?,executor_name_=?,executed_at_=NOW(6),version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0",result,actual,executorId,executorName,user,tenant,id,revision);}
    public void replaceEvidence(String tenant,String result,List<TestExecutionDefinition.EvidenceInput> evidence,String user){
        jdbc.update("UPDATE t_product_test_execution_evidence SET delete_flag_=1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND execution_case_id_=? AND delete_flag_=0",user,tenant,result);
        for(var e:evidence)jdbc.update("INSERT INTO t_product_test_execution_evidence(id_,tenant_id_,execution_case_id_,name_,content_type_,size_,data_url_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))",UUID.randomUUID().toString(),tenant,result,e.name(),e.contentType(),e.size(),e.dataUrl(),user,user);
    }
    public List<Map<String,Object>> evidence(String tenant,String result){return jdbc.queryForList("SELECT id_ AS id,name_ AS name,content_type_ AS contentType,size_ AS size,data_url_ AS dataUrl FROM t_product_test_execution_evidence WHERE tenant_id_=? AND execution_case_id_=? AND delete_flag_=0 ORDER BY create_time_",tenant,result);}
    public int endExecution(String tenant,String id,int revision,String user){return jdbc.update("UPDATE t_product_test_execution SET status_='ENDED',end_time_=NOW(6),version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND status_='IN_PROGRESS' AND delete_flag_=0",user,tenant,id,revision);}
    public Map<String,Object> previousEnded(String tenant,String plan){return one("SELECT id_ AS id FROM t_product_test_execution WHERE tenant_id_=? AND test_plan_id_=? AND status_='ENDED' AND delete_flag_=0 ORDER BY round_no_ DESC LIMIT 1",tenant,plan);}
    public List<String> failedCaseIds(String tenant,String execution){return jdbc.queryForList("SELECT test_case_id_ FROM t_product_test_execution_case WHERE tenant_id_=? AND execution_id_=? AND result_='FAILED' AND delete_flag_=0 ORDER BY sort_",String.class,tenant,execution);}
    public List<Map<String,Object>> defects(String tenant,String result){return jdbc.queryForList("""
      SELECT d.defect_work_item_id_ AS id,w.code_ AS code,w.title_ AS title,w.status_name_ AS status,w.status_group_ AS statusGroup,w.successful_ AS successful,w.priority_ AS priority,w.assignee_name_ AS assigneeName
      FROM t_product_test_execution_defect d JOIN t_product_work_item w ON w.tenant_id_=d.tenant_id_ AND w.id_=d.defect_work_item_id_ AND w.delete_flag_=0
      WHERE d.tenant_id_=? AND d.execution_case_id_=? AND d.delete_flag_=0 ORDER BY d.create_time_
      """,tenant,result);}
    public List<Map<String,Object>> defectsForWorkItem(String tenant,String workItem){return jdbc.queryForList("""
      SELECT d.id_ AS id,d.code_ AS code,d.title_ AS title,d.status_name_ AS status,d.priority_ AS priority,d.assignee_name_ AS assigneeName,d.successful_ AS successful,
        MAX(ed.create_time_) AS linkedAt
      FROM t_product_test_execution e
      JOIN t_product_test_execution_case ec ON ec.tenant_id_=e.tenant_id_ AND ec.execution_id_=e.id_ AND ec.delete_flag_=0
      JOIN t_product_test_execution_defect ed ON ed.tenant_id_=ec.tenant_id_ AND ed.execution_case_id_=ec.id_ AND ed.delete_flag_=0
      JOIN t_product_work_item d ON d.tenant_id_=ed.tenant_id_ AND d.id_=ed.defect_work_item_id_ AND d.delete_flag_=0
      WHERE e.tenant_id_=? AND e.work_item_id_=? AND e.delete_flag_=0
      GROUP BY d.id_,d.code_,d.title_,d.status_name_,d.priority_,d.assignee_name_,d.successful_
      ORDER BY linkedAt DESC
      """,tenant,workItem);}
    public void insertDefectLink(String tenant,String line,String result,String defect,String user){jdbc.update("INSERT INTO t_product_test_execution_defect(id_,tenant_id_,product_line_id_,execution_case_id_,defect_work_item_id_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(6))",UUID.randomUUID().toString(),tenant,line,result,defect,user,user,java.sql.Timestamp.valueOf(java.time.LocalDateTime.now()));}
    public List<Map<String,Object>> descendants(String tenant,String root){return jdbc.queryForList("""
      WITH RECURSIVE children AS (
        SELECT * FROM t_product_work_item WHERE tenant_id_=? AND parent_work_item_id_=? AND delete_flag_=0
        UNION ALL SELECT w.* FROM t_product_work_item w JOIN children c ON w.parent_work_item_id_=c.id_ WHERE w.tenant_id_=? AND w.delete_flag_=0)
      SELECT id_ AS id,title_ AS title,task_type_id_ AS taskTypeId,status_name_ AS statusName,successful_ AS successful,estimated_hours_ AS estimatedHours,actual_hours_ AS actualHours FROM children
      """,tenant,root,tenant);}
}
