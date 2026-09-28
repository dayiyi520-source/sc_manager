package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class WorkItemFieldConfigurationMapper {
    private final JdbcTemplate jdbc;
    public WorkItemFieldConfigurationMapper(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    List<Map<String,Object>> list(String tenant,String categoryCode) {
        return jdbc.queryForList("SELECT id_ AS id,category_code_ AS categoryCode,scene_ AS scene,field_code_ AS fieldCode,visible_ AS visible,required_ AS required,sort_ AS sort,version_ AS revision FROM t_work_item_field_configuration WHERE tenant_id_=? AND category_code_=? AND delete_flag_=0 ORDER BY scene_,sort_,id_",tenant,categoryCode);
    }
    void upsert(String tenant,String categoryCode,String scene,String fieldCode,boolean visible,boolean required,int sort,String user) {
        int updated=jdbc.update("UPDATE t_work_item_field_configuration SET visible_=?,required_=?,sort_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND category_code_=? AND scene_=? AND field_code_=? AND delete_flag_=0",visible?1:0,required?1:0,sort,user,tenant,categoryCode,scene,fieldCode);
        if(updated==0) jdbc.update("INSERT INTO t_work_item_field_configuration(id_,tenant_id_,category_code_,scene_,field_code_,visible_,required_,sort_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))",UUID.randomUUID().toString(),tenant,categoryCode,scene,fieldCode,visible?1:0,required?1:0,sort,user,user);
    }
    void deleteCategory(String tenant,String categoryCode) { jdbc.update("UPDATE t_work_item_field_configuration SET delete_flag_=1,update_time_=NOW(6) WHERE tenant_id_=? AND category_code_=? AND delete_flag_=0",tenant,categoryCode); }
}
