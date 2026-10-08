package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class RecycleBinMapper {
    private final JdbcTemplate jdbc;
    public RecycleBinMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    List<Map<String,Object>> list(String tenant,String line) {
        return jdbc.queryForList("""
            SELECT w.id_ AS id,w.category_ AS category,w.title_ AS title,w.code_ AS code,
              w.version_id_ AS versionId,COALESCE(v.code_,v.name_,'未规划版本') AS versionName,
              COALESCE(u.name_,w.update_by_) AS operatorName,w.update_time_ AS operatedAt,w.version_ AS revision
            FROM t_product_work_item w
            LEFT JOIN t_product_line_version v ON v.tenant_id_=w.tenant_id_ AND v.id_=w.version_id_
            LEFT JOIN t_sys_user u ON u.tenant_id_=w.tenant_id_ AND u.id_=w.update_by_ AND u.delete_flag_=0
            WHERE w.tenant_id_=? AND w.product_line_id_=? AND w.delete_flag_=1
              AND w.category_ IN ('requirement','design','dev','test','bug')
            ORDER BY w.update_time_ DESC,w.id_
            """,tenant,line);
    }

    Map<String,Object> deleted(String tenant,String line,String id) {
        List<Map<String,Object>> rows=jdbc.queryForList("SELECT id_ AS id,category_ AS category,parent_work_item_id_ AS parentWorkItemId,version_ AS revision FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=1",tenant,line,id);
        return rows.isEmpty()?null:rows.get(0);
    }

    int restore(String tenant,String line,String id,int revision,String user) {
        return jdbc.update("UPDATE t_product_work_item SET delete_flag_=0,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=1",user,tenant,line,id,revision);
    }

    boolean hasChildren(String tenant,String line,String id) {
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND parent_work_item_id_=?",Integer.class,tenant,line,id);
        return count!=null&&count>0;
    }

    boolean activeItemExists(String tenant,String line,String id) {
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",Integer.class,tenant,line,id);
        return count!=null&&count>0;
    }

    void purgeRelations(String tenant,String line,String id) {
        jdbc.update("DELETE FROM t_product_test_execution_defect WHERE tenant_id_=? AND (defect_work_item_id_=? OR execution_case_id_ IN (SELECT ec.id_ FROM t_product_test_execution_case ec JOIN t_product_test_execution e ON e.tenant_id_=ec.tenant_id_ AND e.id_=ec.execution_id_ WHERE e.tenant_id_=? AND e.work_item_id_=?))",tenant,id,tenant,id);
        jdbc.update("DELETE FROM t_product_test_execution_case WHERE tenant_id_=? AND execution_id_ IN (SELECT id_ FROM t_product_test_execution WHERE tenant_id_=? AND work_item_id_=?)",tenant,tenant,id);
        jdbc.update("DELETE FROM t_product_test_execution WHERE tenant_id_=? AND work_item_id_=?",tenant,id);
        jdbc.update("DELETE FROM t_product_test_plan WHERE tenant_id_=? AND work_item_id_=?",tenant,id);
        jdbc.update("DELETE FROM t_product_test_case_work_item WHERE tenant_id_=? AND work_item_id_=?",tenant,id);
        jdbc.update("DELETE FROM t_product_automation_log WHERE tenant_id_=? AND product_line_id_=? AND work_item_id_=?",tenant,line,id);
        jdbc.update("DELETE FROM t_product_attachment_resource WHERE tenant_id_=? AND subject_id_=?",tenant,id);
        jdbc.update("DELETE FROM t_product_work_item_relation WHERE tenant_id_=? AND product_line_id_=? AND (source_id_=? OR target_id_=?)",tenant,line,id,id);
        jdbc.update("DELETE FROM t_product_work_item_activity WHERE tenant_id_=? AND product_line_id_=? AND subject_id_=?",tenant,line,id);
    }

    int purge(String tenant,String line,String id,int revision) {
        return jdbc.update("DELETE FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=1",tenant,line,id,revision);
    }
}
