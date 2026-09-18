package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class AutomationRuleMapper {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public AutomationRuleMapper(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public List<Map<String,Object>> list(String tenant,String line,String keyword){
        String like="%"+(keyword==null?"":keyword.trim())+"%";
        return jdbc.queryForList("SELECT id_ AS id,name_ AS name,enabled_ AS enabled,trigger_type_ AS triggerType,trigger_type_id_ AS triggerTypeId,trigger_state_key_ AS triggerStateKey,condition_type_ AS conditionType,condition_value_ AS conditionValue,action_type_ AS actionType,action_config_ AS actionConfig,version_ AS revision,update_time_ AS updatedAt FROM t_product_automation_rule WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0 AND name_ LIKE ? ORDER BY update_time_ DESC",tenant,line,like);
    }
    public Map<String,Object> one(String tenant,String line,String id){List<Map<String,Object>> rows=jdbc.queryForList("SELECT id_ AS id,name_ AS name,enabled_ AS enabled,trigger_type_ AS triggerType,trigger_type_id_ AS triggerTypeId,trigger_state_key_ AS triggerStateKey,condition_type_ AS conditionType,condition_value_ AS conditionValue,action_type_ AS actionType,action_config_ AS actionConfig,version_ AS revision FROM t_product_automation_rule WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",tenant,line,id);return rows.isEmpty()?null:rows.get(0);}
    public void insert(String tenant,String line,String id,Map<String,Object>b,String user){jdbc.update("INSERT INTO t_product_automation_rule(id_,tenant_id_,product_line_id_,name_,enabled_,trigger_type_,trigger_type_id_,trigger_state_key_,condition_type_,condition_value_,action_type_,action_config_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(6),NOW(6))",id,tenant,line,b.get("name"),enabled(b.get("enabled")),b.get("triggerType"),b.get("triggerTypeId"),b.get("triggerStateKey"),nullable(b.get("conditionType")),nullable(b.get("conditionValue")),b.get("actionType"),encode(b.getOrDefault("actionConfig",Map.of())),user,user);}
    public int update(String tenant,String line,String id,int revision,Map<String,Object>b,String user){return jdbc.update("UPDATE t_product_automation_rule SET name_=?,enabled_=?,trigger_type_=?,trigger_type_id_=?,trigger_state_key_=?,condition_type_=?,condition_value_=?,action_type_=?,action_config_=CAST(? AS JSON),version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND version_=? AND delete_flag_=0",b.get("name"),enabled(b.get("enabled")),b.get("triggerType"),b.get("triggerTypeId"),b.get("triggerStateKey"),nullable(b.get("conditionType")),nullable(b.get("conditionValue")),b.get("actionType"),encode(b.getOrDefault("actionConfig",Map.of())),user,tenant,line,id,revision);}
    public int delete(String tenant,String line,String id,String user){return jdbc.update("UPDATE t_product_automation_rule SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",user,tenant,line,id);}
    public boolean setting(String tenant,String line){List<Map<String,Object>> rows=jdbc.queryForList("SELECT enabled_ AS enabled FROM t_product_automation_setting WHERE tenant_id_=? AND product_line_id_=?",tenant,line);return rows.isEmpty()||enabled(rows.get(0).get("enabled"))==1;}
    public void setting(String tenant,String line,boolean enabled,String user){jdbc.update("INSERT INTO t_product_automation_setting(tenant_id_,product_line_id_,enabled_,update_by_,update_time_) VALUES(?,?,?,?,NOW(6)) ON DUPLICATE KEY UPDATE enabled_=VALUES(enabled_),update_by_=VALUES(update_by_),update_time_=NOW(6)",tenant,line,enabled?1:0,user);}
    public List<Map<String,Object>> logs(String tenant,String line){return jdbc.queryForList("SELECT id_ AS id,rule_id_ AS ruleId,work_item_id_ AS workItemId,result_ AS result,detail_ AS detail,create_time_ AS createdAt FROM t_product_automation_log WHERE tenant_id_=? AND product_line_id_=? ORDER BY create_time_ DESC LIMIT 100",tenant,line);}
    public List<Map<String,Object>> matching(String tenant,String line,String typeId,String stateKey){
        return jdbc.queryForList("""
            SELECT id_ AS id,name_ AS name,condition_type_ AS conditionType,condition_value_ AS conditionValue,
                   action_type_ AS actionType,action_config_ AS actionConfig
            FROM t_product_automation_rule
            WHERE tenant_id_=? AND product_line_id_=? AND trigger_type_='STATUS_CHANGED'
              AND trigger_type_id_=? AND trigger_state_key_=? AND enabled_=1 AND delete_flag_=0
              AND NOT EXISTS (
                SELECT 1 FROM t_product_automation_setting setting
                WHERE setting.tenant_id_=t_product_automation_rule.tenant_id_
                  AND setting.product_line_id_=t_product_automation_rule.product_line_id_
                  AND setting.enabled_=0
              )
            ORDER BY create_time_,id_
            """,tenant,line,typeId,stateKey);
    }
    public int markActualStart(String tenant,String line,String workItemId,String user){
        return jdbc.update("UPDATE t_product_work_item SET actual_start_at_=COALESCE(actual_start_at_,NOW(6)),update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0",user,tenant,line,workItemId);
    }
    public void log(String tenant,String line,String ruleId,String workItemId,String result,String detail){
        jdbc.update("INSERT INTO t_product_automation_log(id_,tenant_id_,product_line_id_,rule_id_,work_item_id_,result_,detail_,create_time_) VALUES(?,?,?,?,?,?,?,NOW(6))",UUID.randomUUID().toString(),tenant,line,ruleId,workItemId,result,detail);
    }
    public Map<String,Object> decodeConfig(Object value){
        if(value instanceof Map<?,?> map) return new LinkedHashMap<>((Map<String,Object>)map);
        try{return json.readValue(Objects.toString(value,"{}"),new com.fasterxml.jackson.core.type.TypeReference<>(){});}
        catch(JsonProcessingException e){throw new IllegalArgumentException("自动化动作配置格式无效",e);}
    }
    private int enabled(Object value){return Boolean.FALSE.equals(value)?0:1;}
    private Object nullable(Object value){
        if(value==null||String.valueOf(value).isBlank()) return null;
        if(value instanceof Collection<?> || value instanceof Map<?,?>) return encode(value);
        return value;
    }
    private String encode(Object value){try{return json.writeValueAsString(value);}catch(JsonProcessingException e){throw new IllegalArgumentException("自动化动作配置格式无效",e);}}
}
