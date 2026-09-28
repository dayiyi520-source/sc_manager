package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class AutomationTemplateMapper {
 private final JdbcTemplate jdbc;
 public AutomationTemplateMapper(JdbcTemplate jdbc){this.jdbc=jdbc;}
 List<Map<String,Object>> list(String tenant){return jdbc.queryForList("SELECT id_ AS id,name_ AS name,enabled_ AS enabled,trigger_type_ AS triggerType,trigger_type_id_ AS triggerTypeId,trigger_state_key_ AS triggerStateKey,condition_type_ AS conditionType,condition_value_ AS conditionValue,action_type_ AS actionType,action_config_ AS actionConfig,version_ AS revision,update_time_ AS updatedAt FROM t_automation_template_rule WHERE tenant_id_=? AND delete_flag_=0 ORDER BY update_time_ DESC",tenant);}
 Map<String,Object> one(String tenant,String id){return list(tenant).stream().filter(row->id.equals(row.get("id"))).findFirst().orElse(null);}
 boolean enabled(String tenant){List<Integer> rows=jdbc.queryForList("SELECT enabled_ FROM t_automation_template_setting WHERE tenant_id_=?",Integer.class,tenant);return rows.isEmpty()||rows.get(0)!=0;}
 void setting(String tenant,boolean enabled,String user){jdbc.update("INSERT INTO t_automation_template_setting(tenant_id_,enabled_,update_by_,update_time_) VALUES(?,?,?,NOW(6)) ON DUPLICATE KEY UPDATE enabled_=VALUES(enabled_),update_by_=VALUES(update_by_),update_time_=NOW(6)",tenant,enabled?1:0,user);}
 void insert(String tenant,String id,Map<String,Object>b,String user){jdbc.update("INSERT INTO t_automation_template_rule(id_,tenant_id_,name_,enabled_,trigger_type_,trigger_type_id_,trigger_state_key_,condition_type_,condition_value_,action_type_,action_config_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(6),NOW(6))",id,tenant,b.get("name"),Boolean.FALSE.equals(b.get("enabled"))?0:1,b.get("triggerType"),b.get("triggerTypeId"),b.get("triggerStateKey"),b.get("conditionType"),b.get("conditionValue"),b.get("actionType"),b.get("actionConfig"),user,user);}
 int update(String tenant,String id,int revision,Map<String,Object>b,String user){return jdbc.update("UPDATE t_automation_template_rule SET name_=?,enabled_=?,trigger_type_=?,trigger_type_id_=?,trigger_state_key_=?,condition_type_=?,condition_value_=?,action_type_=?,action_config_=CAST(? AS JSON),version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0",b.get("name"),Boolean.FALSE.equals(b.get("enabled"))?0:1,b.get("triggerType"),b.get("triggerTypeId"),b.get("triggerStateKey"),b.get("conditionType"),b.get("conditionValue"),b.get("actionType"),b.get("actionConfig"),user,tenant,id,revision);}
 int delete(String tenant,String id,String user){return jdbc.update("UPDATE t_automation_template_rule SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND delete_flag_=0",user,tenant,id);}
}
