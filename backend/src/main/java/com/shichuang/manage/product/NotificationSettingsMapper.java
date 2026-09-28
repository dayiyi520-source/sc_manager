package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class NotificationSettingsMapper {
 private final JdbcTemplate jdbc;
 public NotificationSettingsMapper(JdbcTemplate jdbc) { this.jdbc=jdbc; }
 String readTemplate(String tenant) { List<String> rows=jdbc.queryForList("SELECT config_ FROM t_notification_template WHERE tenant_id_=?",String.class,tenant); return rows.isEmpty()?null:rows.get(0); }
 String readProduct(String tenant,String line) { List<String> rows=jdbc.queryForList("SELECT config_ FROM t_product_notification_setting WHERE tenant_id_=? AND product_line_id_=?",String.class,tenant,line); return rows.isEmpty()?null:rows.get(0); }
 void saveTemplate(String tenant,String config,String user) { jdbc.update("INSERT INTO t_notification_template(tenant_id_,config_,update_by_,update_time_) VALUES(?,CAST(? AS JSON),?,NOW(6)) ON DUPLICATE KEY UPDATE config_=VALUES(config_),update_by_=VALUES(update_by_),update_time_=NOW(6)",tenant,config,user); }
 void saveProduct(String tenant,String line,String config,String user) { jdbc.update("INSERT INTO t_product_notification_setting(tenant_id_,product_line_id_,config_,update_by_,update_time_) VALUES(?,?,CAST(? AS JSON),?,NOW(6)) ON DUPLICATE KEY UPDATE config_=VALUES(config_),update_by_=VALUES(update_by_),update_time_=NOW(6)",tenant,line,config,user); }
}
