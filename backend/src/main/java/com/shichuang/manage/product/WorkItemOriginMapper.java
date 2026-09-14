package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class WorkItemOriginMapper {
    private final JdbcTemplate jdbc;
    public WorkItemOriginMapper(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void source(String tenant,String line,String id,String source) {
        jdbc.update("UPDATE t_product_work_item SET source_type_=? WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",source,tenant,line,id);
    }
    public String fingerprint(String tenant,String line,String id,String event) {
        var rows=jdbc.queryForList("SELECT JSON_UNQUOTE(JSON_EXTRACT(content_,'$.fingerprint')) AS fingerprint FROM t_product_work_item_activity WHERE tenant_id_=? AND product_line_id_=? AND subject_id_=? AND event_type_=? ORDER BY create_time_ LIMIT 1",tenant,line,id,event);
        return rows.isEmpty()?null:Objects.toString(rows.get(0).get("fingerprint"),null);
    }
    public boolean hasPendingRegression(String tenant,String line,String bug) {
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item_relation r JOIN t_product_work_item t ON t.tenant_id_=r.tenant_id_ AND t.product_line_id_=r.product_line_id_ AND t.id_=r.target_id_ AND t.delete_flag_=0 WHERE r.tenant_id_=? AND r.product_line_id_=? AND r.source_id_=? AND r.type_='REQUIRES_REGRESSION' AND r.delete_flag_=0 AND t.successful_=0",Integer.class,tenant,line,bug);
        return count!=null && count>0;
    }
}
