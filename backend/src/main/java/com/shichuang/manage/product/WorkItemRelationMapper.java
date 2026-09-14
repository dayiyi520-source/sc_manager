package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class WorkItemRelationMapper {
    private final JdbcTemplate jdbc;
    public WorkItemRelationMapper(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<Map<String,Object>> items(String tenant,String line) {
        return jdbc.queryForList("SELECT id_ AS id,category_ AS category,status_group_ AS statusGroup,successful_ AS successful,priority_ AS priority,parent_work_item_id_ AS parentId,requirement_id_ AS requirementId FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0",tenant,line);
    }
    public List<Map<String,Object>> relations(String tenant,String line) {
        return jdbc.queryForList("SELECT id_ AS id,source_id_ AS sourceId,target_id_ AS targetId,type_ AS type,scope_ AS scope,during_testing_ AS duringTesting,version_ AS revision,delete_flag_ AS deleted FROM t_product_work_item_relation WHERE tenant_id_=? AND product_line_id_=? ORDER BY create_time_,id_",tenant,line);
    }
    public void insert(String tenant,String line,String id,String source,String target,String type,String scope,boolean during,String user) {
        jdbc.update("INSERT INTO t_product_work_item_relation(id_,tenant_id_,product_line_id_,source_id_,target_id_,type_,scope_,during_testing_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))",id,tenant,line,source,target,type,scope,during,user,user);
    }
    public int change(String tenant,String line,String id,int revision,boolean deleted,String scope,boolean during,String user) {
        return jdbc.update("UPDATE t_product_work_item_relation SET delete_flag_=?,scope_=?,during_testing_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=?",deleted,scope,during,user,tenant,line,id,revision);
    }
    public void touch(String tenant,String line,String id,String user) {
        jdbc.update("UPDATE t_product_work_item SET version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",user,tenant,line,id);
    }
}
