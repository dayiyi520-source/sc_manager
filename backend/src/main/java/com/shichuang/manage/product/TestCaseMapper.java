package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class TestCaseMapper {
    private final JdbcTemplate jdbc;
    public TestCaseMapper(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private Map<String,Object> one(String sql,Object...args) {
        List<Map<String,Object>> rows=jdbc.queryForList(sql,args); return rows.isEmpty()?null:rows.get(0);
    }
    public Map<String,Object> directory(String tenant,String line,String id) {
        return one("SELECT id_ AS id,parent_id_ AS parentId,name_ AS name,sort_ AS sort,version_ AS revision FROM t_product_test_case_directory WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",tenant,line,id);
    }
    public List<Map<String,Object>> directories(String tenant,String line) {
        return jdbc.queryForList("""
            SELECT d.id_ AS id,d.parent_id_ AS parentId,d.name_ AS name,d.sort_ AS sort,d.version_ AS revision,
              COUNT(c.id_) AS caseCount
            FROM t_product_test_case_directory d
            LEFT JOIN t_product_test_case c ON c.tenant_id_=d.tenant_id_ AND c.product_line_id_=d.product_line_id_ AND c.directory_id_=d.id_ AND c.delete_flag_=0
            WHERE d.tenant_id_=? AND d.product_line_id_=? AND d.delete_flag_=0
            GROUP BY d.id_,d.parent_id_,d.name_,d.sort_,d.version_ ORDER BY d.sort_,d.create_time_,d.id_
            """,tenant,line);
    }
    public void insertDirectory(String tenant,String line,String id,String parent,String name,int sort,String user) {
        jdbc.update("INSERT INTO t_product_test_case_directory(id_,tenant_id_,product_line_id_,parent_id_,name_,sort_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(6),NOW(6))",id,tenant,line,parent,name,sort,user,user);
    }
    private static final String CASE_SELECT="""
        SELECT c.id_ AS id,c.code_ AS code,c.product_line_id_ AS productLineId,c.directory_id_ AS directoryId,
          d.name_ AS directoryName,c.source_requirement_id_ AS sourceRequirementId,r.title_ AS sourceRequirementTitle,
          c.title_ AS title,c.precondition_ AS precondition,c.priority_ AS priority,c.owner_id_ AS ownerId,c.owner_name_ AS ownerName,
          c.tags_ AS tags,c.enabled_ AS enabled,c.version_ AS revision,c.create_time_ AS createdAt,c.update_time_ AS updatedAt,
          (SELECT COUNT(*) FROM t_product_test_case_work_item l WHERE l.tenant_id_=c.tenant_id_ AND l.test_case_id_=c.id_ AND l.delete_flag_=0) AS referenceCount,
          (SELECT ec.result_ FROM t_product_test_execution_case ec WHERE ec.tenant_id_=c.tenant_id_ AND ec.test_case_id_=c.id_ AND ec.delete_flag_=0 ORDER BY ec.executed_at_ DESC,ec.create_time_ DESC LIMIT 1) AS latestResult
        FROM t_product_test_case c
        JOIN t_product_test_case_directory d ON d.tenant_id_=c.tenant_id_ AND d.product_line_id_=c.product_line_id_ AND d.id_=c.directory_id_ AND d.delete_flag_=0
        LEFT JOIN t_product_work_item r ON r.tenant_id_=c.tenant_id_ AND r.product_line_id_=c.product_line_id_ AND r.id_=c.source_requirement_id_ AND r.delete_flag_=0
        WHERE c.tenant_id_=? AND c.product_line_id_=? AND c.delete_flag_=0
        """;
    public Map<String,Object> item(String tenant,String line,String id) { return one(CASE_SELECT+" AND c.id_=?",tenant,line,id); }
    public long count(String tenant,String line,TestCaseDefinition.Query q) {
        StringBuilder sql=new StringBuilder("SELECT COUNT(*) FROM t_product_test_case c WHERE c.tenant_id_=? AND c.product_line_id_=? AND c.delete_flag_=0");
        List<Object>a=new ArrayList<>(List.of(tenant,line)); filters(sql,a,q); return jdbc.queryForObject(sql.toString(),Long.class,a.toArray());
    }
    public List<Map<String,Object>> list(String tenant,String line,TestCaseDefinition.Query q) {
        StringBuilder sql=new StringBuilder(CASE_SELECT); List<Object>a=new ArrayList<>(List.of(tenant,line)); filters(sql,a,q);
        sql.append(" ORDER BY c.create_time_ DESC,c.id_ LIMIT ? OFFSET ?"); a.add(q.pageSize());a.add((q.page()-1)*q.pageSize());
        return jdbc.queryForList(sql.toString(),a.toArray());
    }
    private static void filters(StringBuilder sql,List<Object>a,TestCaseDefinition.Query q) {
        if(q.directoryId()!=null&&!q.directoryId().isBlank()){sql.append(" AND c.directory_id_=?");a.add(q.directoryId());}
        if(q.keyword()!=null&&!q.keyword().isBlank()){sql.append(" AND (c.code_ LIKE ? OR c.title_ LIKE ?)");String k="%"+q.keyword().trim()+"%";a.add(k);a.add(k);}
        if(q.priority()!=null&&!q.priority().isBlank()){sql.append(" AND c.priority_=?");a.add(q.priority());}
        if(q.ownerId()!=null&&!q.ownerId().isBlank()){sql.append(" AND c.owner_id_=?");a.add(q.ownerId());}
        if(q.enabled()!=null){sql.append(" AND c.enabled_=?");a.add(q.enabled());}
    }
    public List<Map<String,Object>> steps(String tenant,String caseId) {
        return jdbc.queryForList("SELECT id_ AS id,sort_ AS sort,action_ AS action,expected_result_ AS expectedResult FROM t_product_test_case_step WHERE tenant_id_=? AND test_case_id_=? AND delete_flag_=0 ORDER BY sort_,id_",tenant,caseId);
    }
    public int nextCode(String tenant,String line) {
        Integer value=jdbc.queryForObject("SELECT COALESCE(MAX(CAST(SUBSTRING(code_,4) AS UNSIGNED)),0)+1 FROM t_product_test_case WHERE tenant_id_=? AND product_line_id_=?",Integer.class,tenant,line);return value==null?1:value;
    }
    public void insertCase(String tenant,String line,String id,String code,TestCaseDefinition.SaveCase input,String ownerName,String tags,String user) {
        jdbc.update("""
          INSERT INTO t_product_test_case(id_,tenant_id_,product_line_id_,directory_id_,source_requirement_id_,code_,title_,precondition_,priority_,owner_id_,owner_name_,tags_,create_by_,update_by_,create_time_,update_time_)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(6),NOW(6))
          """,id,tenant,line,input.directoryId(),blank(input.sourceRequirementId()),code,input.title().trim(),input.precondition(),input.priority(),input.ownerId(),ownerName,tags,user,user);
    }
    public int updateCase(String tenant,String line,String id,TestCaseDefinition.SaveCase input,String ownerName,String tags,String user) {
        return jdbc.update("""
          UPDATE t_product_test_case SET directory_id_=?,source_requirement_id_=?,title_=?,precondition_=?,priority_=?,owner_id_=?,owner_name_=?,tags_=CAST(? AS JSON),version_=version_+1,update_by_=?,update_time_=NOW(6)
          WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=0
          """,input.directoryId(),blank(input.sourceRequirementId()),input.title().trim(),input.precondition(),input.priority(),input.ownerId(),ownerName,tags,user,tenant,line,id,input.revision());
    }
    public void replaceSteps(String tenant,String caseId,List<TestCaseDefinition.StepInput> steps,String user) {
        jdbc.update("UPDATE t_product_test_case_step SET delete_flag_=1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND test_case_id_=? AND delete_flag_=0",user,tenant,caseId);
        for(int i=0;i<steps.size();i++){var s=steps.get(i);jdbc.update("INSERT INTO t_product_test_case_step(id_,tenant_id_,test_case_id_,sort_,action_,expected_result_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(6),NOW(6))",UUID.randomUUID().toString(),tenant,caseId,i+1,s.action().trim(),s.expectedResult().trim(),user,user);}
    }
    public int setEnabled(String tenant,String line,String id,int revision,boolean enabled,String user) {
        return jdbc.update("UPDATE t_product_test_case SET enabled_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=0",enabled,user,tenant,line,id,revision);
    }
    public Map<String,Object> requirement(String tenant,String line,String id) { return one("SELECT id_ AS id,version_id_ AS versionId FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0",tenant,line,id); }
    public Map<String,Object> employee(String tenant,String id) { return one("SELECT id_ AS id,name_ AS name FROM t_sys_user WHERE tenant_id_=? AND id_=? AND status_='enabled' AND delete_flag_=0",tenant,id); }
    private static String blank(String value){return value==null||value.isBlank()?null:value;}
}
