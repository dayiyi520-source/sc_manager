package com.shichuang.manage.crm;

import org.springframework.jdbc.core.JdbcTemplate;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class CrmMapper {
    private static String tenant() { return RequestContext.tenantId(); }
    private final JdbcTemplate jdbc;

    public CrmMapper(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    long countJourney(String customerId, String leadId, String opportunityId, String requirementId, String workItemId) {
        String sql = "SELECT COUNT(*) FROM (" + journeySql() + ") j WHERE " + journeyFilters();
        Long count = jdbc.queryForObject(sql, Long.class, journeyArgs(customerId, leadId, opportunityId, requirementId, workItemId));
        return count == null ? 0 : count;
    }

    List<Map<String, Object>> findJourney(String customerId, String leadId, String opportunityId, String requirementId, String workItemId, int pageSize, int offset) {
        String sql = "SELECT j.* FROM (" + journeySql() + ") j WHERE " + journeyFilters() + " ORDER BY j.occurredAt DESC,j.id DESC LIMIT ? OFFSET ?";
        Object[] args = journeyArgs(customerId, leadId, opportunityId, requirementId, workItemId);
        return jdbc.queryForList(sql, concat(args, pageSize, offset));
    }

    private static String journeyFilters() {
        return "j.tenantId=? AND (?='' OR j.customerId=?) AND (?='' OR j.leadId=?) AND (?='' OR j.opportunityId=?) AND (?='' OR j.requirementId=?) AND (?='' OR j.workItemId=?)";
    }

    private Object[] journeyArgs(String customerId, String leadId, String opportunityId, String requirementId, String workItemId) {
        return new Object[]{tenant(), customerId, customerId, leadId, leadId, opportunityId, opportunityId, requirementId, requirementId, workItemId, workItemId};
    }

    private static String journeySql() {
        return "SELECT CONCAT('customer:',c.id_) AS id,'客户建立' AS eventType,c.name_ AS title,CONCAT('客户状态：',COALESCE(c.status_,'')) AS description,c.status_ AS status,c.create_time_ AS occurredAt,c.tenant_id_ AS tenantId,c.id_ AS customerId,NULL AS leadId,NULL AS opportunityId,NULL AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_crm_customer c WHERE c.delete_flag_=0 "
            + "UNION ALL SELECT CONCAT('lead:',l.id_,':created') AS id,'线索创建' AS eventType,l.name_ AS title,CONCAT('联系人：',COALESCE(l.school_contact_,'')) AS description,l.status_ AS status,l.create_time_ AS occurredAt,l.tenant_id_ AS tenantId,l.customer_id_ AS customerId,l.id_ AS leadId,NULL AS opportunityId,NULL AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_crm_lead l WHERE l.delete_flag_=0 "
            + "UNION ALL SELECT CONCAT('lead:',l.id_,':converted') AS id,'线索转商机' AS eventType,l.name_ AS title,'线索已转入商机管理' AS description,l.status_ AS status,l.update_time_ AS occurredAt,l.tenant_id_ AS tenantId,l.customer_id_ AS customerId,l.id_ AS leadId,l.converted_opportunity_id_ AS opportunityId,NULL AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_crm_lead l WHERE l.delete_flag_=0 AND l.status_='转商机' AND l.converted_opportunity_id_ IS NOT NULL "
            + "UNION ALL SELECT CONCAT('opportunity:',o.id_,':created') AS id,'商机建立' AS eventType,o.name_ AS title,CONCAT('阶段：',COALESCE(o.stage_,'')) AS description,o.stage_ AS status,o.create_time_ AS occurredAt,o.tenant_id_ AS tenantId,o.customer_id_ AS customerId,o.lead_id_ AS leadId,o.id_ AS opportunityId,NULL AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_crm_opportunity o WHERE o.delete_flag_=0 "
            + "UNION ALL SELECT CONCAT('opportunity:',o.id_,':stage') AS id,'商机阶段' AS eventType,o.name_ AS title,CONCAT('当前阶段：',COALESCE(o.stage_,'')) AS description,o.stage_ AS status,o.update_time_ AS occurredAt,o.tenant_id_ AS tenantId,o.customer_id_ AS customerId,o.lead_id_ AS leadId,o.id_ AS opportunityId,NULL AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_crm_opportunity o WHERE o.delete_flag_=0 "
            + "UNION ALL SELECT CONCAT('follow-up:',f.id_) AS id,'客户跟进' AS eventType,CONCAT('跟进：',COALESCE(f.follow_type_,'')) AS title,f.content_ AS description,'已记录' AS status,COALESCE(f.follow_time_,f.create_time_) AS occurredAt,f.tenant_id_ AS tenantId,f.customer_id_ AS customerId,NULL AS leadId,f.opportunity_id_ AS opportunityId,NULL AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_crm_follow_up f WHERE f.delete_flag_=0 "
            + "UNION ALL SELECT CONCAT('requirement:',r.id_,':created') AS id,'需求提交' AS eventType,r.title_ AS title,r.description_ AS description,r.status_ AS status,r.create_time_ AS occurredAt,r.tenant_id_ AS tenantId,r.customer_id_ AS customerId,NULL AS leadId,NULL AS opportunityId,r.id_ AS requirementId,NULL AS workItemId,r.task_type_ AS taskType FROM t_product_requirement r WHERE r.delete_flag_=0 AND r.customer_id_ IS NOT NULL AND r.customer_id_<>'' "
            + "UNION ALL SELECT CONCAT('requirement-event:',e.id_) AS id,e.event_type_ AS eventType,r.title_ AS title,e.reason_ AS description,e.to_status_ AS status,e.create_time_ AS occurredAt,e.tenant_id_ AS tenantId,r.customer_id_ AS customerId,NULL AS leadId,NULL AS opportunityId,r.id_ AS requirementId,NULL AS workItemId,NULL AS taskType FROM t_product_requirement_event e JOIN t_product_requirement r ON r.id_=e.requirement_id_ AND r.tenant_id_=e.tenant_id_ AND r.delete_flag_=0 WHERE r.customer_id_ IS NOT NULL AND r.customer_id_<>'' "
            + "UNION ALL SELECT CONCAT('presales-task:',p.id_) AS id,'售前任务' AS eventType,p.title_ AS title,p.description_ AS description,p.status_ AS status,p.create_time_ AS occurredAt,p.tenant_id_ AS tenantId,r.customer_id_ AS customerId,NULL AS leadId,NULL AS opportunityId,r.id_ AS requirementId,p.id_ AS workItemId,'售前任务' AS taskType FROM t_crm_presales_task p JOIN t_product_requirement r ON r.id_=p.requirement_id_ AND r.tenant_id_=p.tenant_id_ AND r.delete_flag_=0 WHERE p.delete_flag_=0 AND r.customer_id_ IS NOT NULL AND r.customer_id_<>'' "
            + "UNION ALL SELECT CONCAT('delivery-task:',d.id_) AS id,'交付任务' AS eventType,d.title_ AS title,d.description_ AS description,d.status_ AS status,d.create_time_ AS occurredAt,d.tenant_id_ AS tenantId,r.customer_id_ AS customerId,NULL AS leadId,NULL AS opportunityId,r.id_ AS requirementId,d.id_ AS workItemId,'交付任务' AS taskType FROM t_project_delivery_task d JOIN t_product_requirement r ON r.id_=d.requirement_id_ AND r.tenant_id_=d.tenant_id_ AND r.delete_flag_=0 WHERE d.delete_flag_=0 AND r.customer_id_ IS NOT NULL AND r.customer_id_<>''";
    }

    private static Object[] concat(Object[] first, Object... second) {
        Object[] result = java.util.Arrays.copyOf(first, first.length + second.length);
        System.arraycopy(second, 0, result, first.length, second.length);
        return result;
    }

    long countCustomers(String like, String type, String level) {
        String where = "tenant_id_=? AND delete_flag_=0 AND (name_ LIKE ? OR code_ LIKE ? OR contact_name_ LIKE ?) AND (?='' OR type_=?) AND (?='' OR level_=?)";
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_customer WHERE " + where, Long.class, tenant(), like, like, like, type, type, level, level);
    }

    List<Map<String, Object>> findCustomers(String like, String type, String level, int pageSize, int offset) {
        String where = "tenant_id_=? AND delete_flag_=0 AND (name_ LIKE ? OR code_ LIKE ? OR contact_name_ LIKE ?) AND (?='' OR type_=?) AND (?='' OR level_=?)";
        return jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,type_ AS type,level_ AS level,contact_name_ AS contactName,contact_phone_ AS contactPhone,contact_title_ AS contactTitle,contact_email_ AS contactEmail,annual_budget_ AS annualBudget,source_ AS source,address_ AS address,industry_ AS industry,scale_ AS scale,tags_ AS tags,status_ AS status,school_level_ AS schoolLevel,school_nature_ AS schoolNature,school_type_ AS schoolType,ownership_ AS ownership,region_ AS region,create_time_ AS createdAt,version_ AS version,0 AS activeProjectsCount,0 AS potentialOppsCount,'' AS lastFollowUp FROM t_crm_customer WHERE " + where + " ORDER BY create_time_ DESC LIMIT ? OFFSET ?", tenant(), like, like, like, type, type, level, level, pageSize, offset);
    }

    List<Map<String, Object>> findCustomer(String id) {
        return jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,type_ AS type,level_ AS level,contact_name_ AS contactName,contact_phone_ AS contactPhone,contact_title_ AS contactTitle,contact_email_ AS contactEmail,annual_budget_ AS annualBudget,source_ AS source,address_ AS address,industry_ AS industry,scale_ AS scale,tags_ AS tags,status_ AS status,school_level_ AS schoolLevel,school_nature_ AS schoolNature,school_type_ AS schoolType,ownership_ AS ownership,region_ AS region,create_time_ AS createdAt,version_ AS version FROM t_crm_customer WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, tenant());
    }

    void insertCustomer(String id, String code, Map<String, Object> body, String tags) {
        jdbc.update("INSERT INTO t_crm_customer (id_,tenant_id_,code_,name_,type_,level_,contact_name_,contact_phone_,contact_title_,contact_email_,annual_budget_,source_,address_,industry_,scale_,tags_,school_level_,school_nature_,school_type_,ownership_,region_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,?,?,?,'dev','dev',NOW(),NOW())", id, tenant(), code, body.get("name"), body.getOrDefault("type", "民营标杆"), body.getOrDefault("level", "A级-重点"), body.getOrDefault("contactName", "业务负责人"), body.getOrDefault("contactPhone", ""), body.getOrDefault("contactTitle", "项目负责人"), body.get("contactEmail"), body.getOrDefault("annualBudget", 0), body.getOrDefault("source", "主动开发"), body.getOrDefault("address", ""), body.getOrDefault("industry", ""), body.getOrDefault("scale", ""), tags, body.get("schoolLevel"), body.get("schoolNature"), body.get("schoolType"), body.get("ownership"), body.get("region"));
    }

    int updateCustomer(String id, Map<String, Object> body, String tags) {
        return jdbc.update("UPDATE t_crm_customer SET code_=COALESCE(?,code_),name_=COALESCE(?,name_),type_=COALESCE(?,type_),level_=COALESCE(?,level_),contact_name_=COALESCE(?,contact_name_),contact_phone_=COALESCE(?,contact_phone_),contact_title_=COALESCE(?,contact_title_),contact_email_=COALESCE(?,contact_email_),annual_budget_=COALESCE(?,annual_budget_),source_=COALESCE(?,source_),address_=COALESCE(?,address_),industry_=COALESCE(?,industry_),scale_=COALESCE(?,scale_),tags_=COALESCE(CAST(? AS JSON),tags_),school_level_=COALESCE(?,school_level_),school_nature_=COALESCE(?,school_nature_),school_type_=COALESCE(?,school_type_),ownership_=COALESCE(?,ownership_),region_=COALESCE(?,region_),version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", body.get("code"), body.get("name"), body.get("type"), body.get("level"), body.get("contactName"), body.get("contactPhone"), body.get("contactTitle"), body.get("contactEmail"), body.get("annualBudget"), body.get("source"), body.get("address"), body.get("industry"), body.get("scale"), tags, body.get("schoolLevel"), body.get("schoolNature"), body.get("schoolType"), body.get("ownership"), body.get("region"), id, tenant(), body.get("version"));
    }

    long countOpportunities(String like, String stage) {
        String where = "o.tenant_id_=? AND o.delete_flag_=0 AND (o.name_ LIKE ? OR c.name_ LIKE ? OR o.owner_name_ LIKE ?) AND (?='' OR o.stage_=?)";
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_opportunity o JOIN t_crm_customer c ON c.id_=o.customer_id_ WHERE " + where, Long.class, tenant(), like, like, like, stage, stage);
    }

    List<Map<String, Object>> findOpportunities(String like, String stage, int pageSize, int offset) {
        String where = "o.tenant_id_=? AND o.delete_flag_=0 AND (o.name_ LIKE ? OR c.name_ LIKE ? OR o.owner_name_ LIKE ?) AND (?='' OR o.stage_=?)";
        return jdbc.queryForList("SELECT o.id_ AS id,o.name_ AS name,o.type_ AS type,o.customer_id_ AS customerId,o.lead_id_ AS leadId,c.name_ AS customerName,o.stage_ AS stage,o.amount_ AS amount,o.related_product_ AS relatedProduct,o.is_trial_ AS isTrial,o.deadline_ AS deadline,o.expected_close_date_ AS expectedCloseDate,o.win_rate_ AS winRate,o.key_decision_ AS keyDecision,o.owner_name_ AS ownerName,o.collaborators_ AS collaborators,o.source_ AS source,o.probability_ AS probability,o.remarks_ AS remarks,o.version_ AS version,o.create_time_ AS createdAt FROM t_crm_opportunity o JOIN t_crm_customer c ON c.id_=o.customer_id_ WHERE " + where + " ORDER BY o.create_time_ DESC LIMIT ? OFFSET ?", tenant(), like, like, like, stage, stage, pageSize, offset);
    }

    List<Map<String, Object>> findOpportunity(String id) {
        return jdbc.queryForList("SELECT o.id_ AS id,o.name_ AS name,o.type_ AS type,o.customer_id_ AS customerId,o.lead_id_ AS leadId,c.name_ AS customerName,o.stage_ AS stage,o.amount_ AS amount,o.related_product_ AS relatedProduct,o.is_trial_ AS isTrial,o.deadline_ AS deadline,o.expected_close_date_ AS expectedCloseDate,o.win_rate_ AS winRate,o.key_decision_ AS keyDecision,o.owner_name_ AS ownerName,o.collaborators_ AS collaborators,o.source_ AS source,o.probability_ AS probability,o.remarks_ AS remarks,o.version_ AS version,o.create_time_ AS createdAt FROM t_crm_opportunity o JOIN t_crm_customer c ON c.id_=o.customer_id_ WHERE o.id_=? AND o.tenant_id_=? AND o.delete_flag_=0", id, tenant());
    }

    void insertOpportunity(String id, Map<String, Object> body, String customerId) {
        jdbc.update("INSERT INTO t_crm_opportunity (id_,tenant_id_,name_,type_,customer_id_,lead_id_,stage_,amount_,related_product_,is_trial_,deadline_,owner_name_,collaborators_,source_,probability_,remarks_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'dev','dev',NOW(),NOW())", id, tenant(), body.get("name"), body.getOrDefault("type", "新购软件"), customerId, body.get("leadId"), body.getOrDefault("stage", "发现商机"), body.getOrDefault("amount", 0), body.getOrDefault("relatedProduct", "师创智联协同OS"), Boolean.TRUE.equals(body.get("isTrial")) ? 1 : 0, body.getOrDefault("deadline", java.time.LocalDate.now().toString()), body.getOrDefault("ownerName", "开发账号"), "[]", body.getOrDefault("source", "主动开发"), body.getOrDefault("probability", 0), body.getOrDefault("remarks", ""));
    }

    int updateOpportunity(String id, Map<String, Object> body) {
        return jdbc.update("UPDATE t_crm_opportunity SET name_=COALESCE(?,name_),stage_=COALESCE(?,stage_),amount_=COALESCE(?,amount_),probability_=COALESCE(?,probability_),remarks_=COALESCE(?,remarks_),version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", body.get("name"), body.get("stage"), body.get("amount"), body.get("probability"), body.get("remarks"), id, tenant(), body.get("version"));
    }

    int transitionOpportunity(String id, String stage, Object version) {
        return jdbc.update("UPDATE t_crm_opportunity SET stage_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", stage, id, tenant(), version);
    }

    Map<String, Object> opportunityLifecycle(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,customer_id_ AS customerId,name_ AS name,owner_name_ AS ownerName FROM t_crm_opportunity WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, tenant());
        return rows.isEmpty() ? null : rows.get(0);
    }

    Map<String, Object> findBiddingByOpportunity(String opportunityId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,opportunity_id_ AS opportunityId,customer_id_ AS customerId,name_ AS name,status_ AS status,result_ AS result,owner_name_ AS ownerName FROM t_crm_bidding WHERE opportunity_id_=? AND tenant_id_=? AND delete_flag_=0", opportunityId, tenant());
        return rows.isEmpty() ? null : rows.get(0);
    }

    long countBiddings() { return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_bidding WHERE tenant_id_=? AND delete_flag_=0", Long.class, tenant()); }
    List<Map<String, Object>> findBiddings(int limit, int offset) { return jdbc.queryForList("SELECT b.id_ AS id,b.opportunity_id_ AS opportunityId,b.customer_id_ AS customerId,c.name_ AS customerName,b.name_ AS name,b.status_ AS status,b.result_ AS result,b.owner_name_ AS ownerName,b.version_ AS version,b.create_time_ AS createdAt FROM t_crm_bidding b JOIN t_crm_customer c ON c.id_=b.customer_id_ AND c.tenant_id_=b.tenant_id_ WHERE b.tenant_id_=? AND b.delete_flag_=0 ORDER BY b.create_time_ DESC LIMIT ? OFFSET ?", tenant(), limit, offset); }
    long countEngagements() { return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_winning_engagement WHERE tenant_id_=? AND delete_flag_=0", Long.class, tenant()); }
    List<Map<String, Object>> findEngagements(int limit, int offset) { return jdbc.queryForList("SELECT e.id_ AS id,e.bidding_id_ AS biddingId,e.customer_id_ AS customerId,c.name_ AS customerName,e.name_ AS name,e.status_ AS status,e.owner_name_ AS ownerName,e.version_ AS version,e.create_time_ AS createdAt FROM t_crm_winning_engagement e JOIN t_crm_customer c ON c.id_=e.customer_id_ AND c.tenant_id_=e.tenant_id_ WHERE e.tenant_id_=? AND e.delete_flag_=0 ORDER BY e.create_time_ DESC LIMIT ? OFFSET ?", tenant(), limit, offset); }
    long countProjects() { return jdbc.queryForObject("SELECT COUNT(*) FROM t_project WHERE tenant_id_=? AND delete_flag_=0", Long.class, tenant()); }
    List<Map<String, Object>> findProjects(int limit, int offset) { return jdbc.queryForList("SELECT p.id_ AS id,p.engagement_id_ AS engagementId,p.customer_id_ AS customerId,c.name_ AS customerName,p.name_ AS name,p.status_ AS status,p.owner_name_ AS ownerName,p.version_ AS version,p.create_time_ AS createdAt FROM t_project p JOIN t_crm_customer c ON c.id_=p.customer_id_ AND c.tenant_id_=p.tenant_id_ WHERE p.tenant_id_=? AND p.delete_flag_=0 ORDER BY p.create_time_ DESC LIMIT ? OFFSET ?", tenant(), limit, offset); }

    void insertBidding(String id, Map<String, Object> opportunity, Map<String, Object> body) {
        jdbc.update("INSERT INTO t_crm_bidding (id_,tenant_id_,opportunity_id_,customer_id_,name_,status_,result_,owner_name_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,NULL,?,'dev','dev',NOW(),NOW())", id, tenant(), opportunity.get("id"), opportunity.get("customerId"), body.getOrDefault("name", opportunity.get("name")), body.getOrDefault("status", "进行中"), body.getOrDefault("ownerName", opportunity.get("ownerName")));
    }

    int updateBidding(String id, String status, String result, Object version) {
        return jdbc.update("UPDATE t_crm_bidding SET status_=COALESCE(?,status_),result_=COALESCE(?,result_),version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", status, result, id, tenant(), version);
    }

    Map<String, Object> bidding(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,bidding_id_ AS biddingId,customer_id_ AS customerId,name_ AS name,status_ AS status,owner_name_ AS ownerName FROM t_crm_winning_engagement WHERE bidding_id_=? AND tenant_id_=? AND delete_flag_=0", id, tenant());
        return rows.isEmpty() ? null : rows.get(0);
    }

    Map<String, Object> engagement(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,bidding_id_ AS biddingId,customer_id_ AS customerId,name_ AS name,status_ AS status,owner_name_ AS ownerName FROM t_crm_winning_engagement WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, tenant());
        return rows.isEmpty() ? null : rows.get(0);
    }

    void insertEngagement(String id, Map<String, Object> bidding, Map<String, Object> body) {
        jdbc.update("INSERT INTO t_crm_winning_engagement (id_,tenant_id_,bidding_id_,customer_id_,name_,status_,owner_name_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,'dev','dev',NOW(),NOW())", id, tenant(), bidding.get("id"), bidding.get("customerId"), body.getOrDefault("name", bidding.get("name")), body.getOrDefault("status", "待接洽"), body.getOrDefault("ownerName", bidding.get("ownerName")));
    }

    int updateEngagement(String id, String status, Object version) {
        return jdbc.update("UPDATE t_crm_winning_engagement SET status_=COALESCE(?,status_),version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", status, id, tenant(), version);
    }

    Map<String, Object> findProjectByEngagement(String engagementId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,engagement_id_ AS engagementId,customer_id_ AS customerId,name_ AS name,status_ AS status,owner_name_ AS ownerName FROM t_project WHERE engagement_id_=? AND tenant_id_=? AND delete_flag_=0", engagementId, tenant());
        return rows.isEmpty() ? null : rows.get(0);
    }

    void insertProject(String id, Map<String, Object> engagement, Map<String, Object> body) {
        jdbc.update("INSERT INTO t_project (id_,tenant_id_,engagement_id_,customer_id_,name_,status_,owner_name_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,'dev','dev',NOW(),NOW())", id, tenant(), engagement.get("id"), engagement.get("customerId"), body.getOrDefault("name", engagement.get("name")), body.getOrDefault("status", "实施中"), body.getOrDefault("ownerName", engagement.get("ownerName")));
    }

    long countFollowUps(String like, String customerId, String opportunityId, Object from, Object to) {
        String where = "f.tenant_id_=? AND f.delete_flag_=0 AND (f.content_ LIKE ? OR c.name_ LIKE ? OR f.contact_name_ LIKE ?) AND (? IS NULL OR f.customer_id_=?) AND (? IS NULL OR f.opportunity_id_=?) AND (? IS NULL OR f.follow_time_>=?) AND (? IS NULL OR f.follow_time_<?)";
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_follow_up f JOIN t_crm_customer c ON c.id_=f.customer_id_ WHERE " + where, Long.class, tenant(), like, like, like, customerId, customerId, opportunityId, opportunityId, from, from, to, to);
    }

    List<Map<String, Object>> findFollowUps(String like, String customerId, String opportunityId, Object from, Object to, int pageSize, int offset) {
        String where = "f.tenant_id_=? AND f.delete_flag_=0 AND (f.content_ LIKE ? OR c.name_ LIKE ? OR f.contact_name_ LIKE ?) AND (? IS NULL OR f.customer_id_=?) AND (? IS NULL OR f.opportunity_id_=?) AND (? IS NULL OR f.follow_time_>=?) AND (? IS NULL OR f.follow_time_<?)";
        return jdbc.queryForList("SELECT f.id_ AS id,f.customer_id_ AS customerId,c.name_ AS customerName,f.opportunity_id_ AS opportunityId,f.contact_name_ AS contactName,f.follow_type_ AS followType,f.content_ AS content,f.feedback_ AS feedback,f.next_follow_plan_ AS nextFollowPlan,f.next_plan_date_ AS nextPlanDate,f.follow_time_ AS followTime,f.owner_name_ AS ownerName,f.attachments_ AS attachments FROM t_crm_follow_up f JOIN t_crm_customer c ON c.id_=f.customer_id_ WHERE " + where + " ORDER BY f.follow_time_ DESC LIMIT ? OFFSET ?", tenant(), like, like, like, customerId, customerId, opportunityId, opportunityId, from, from, to, to, pageSize, offset);
    }

    List<Map<String, Object>> findFollowUp(String id) {
        return jdbc.queryForList("SELECT f.id_ AS id,f.customer_id_ AS customerId,c.name_ AS customerName,f.opportunity_id_ AS opportunityId,f.contact_name_ AS contactName,f.follow_type_ AS followType,f.content_ AS content,f.feedback_ AS feedback,f.next_follow_plan_ AS nextFollowPlan,f.next_plan_date_ AS nextPlanDate,f.follow_time_ AS followTime,f.owner_name_ AS ownerName,f.attachments_ AS attachments FROM t_crm_follow_up f JOIN t_crm_customer c ON c.id_=f.customer_id_ WHERE f.id_=? AND f.tenant_id_=? AND f.delete_flag_=0", id, tenant());
    }

    void insertFollowUp(String id, Map<String, Object> body, String customerId, String attachments) {
        jdbc.update("INSERT INTO t_crm_follow_up (id_,tenant_id_,customer_id_,opportunity_id_,contact_name_,follow_type_,content_,feedback_,next_follow_plan_,next_plan_date_,follow_time_,owner_name_,attachments_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,COALESCE(?,NOW()),?,?, 'dev','dev',NOW(),NOW())", id, tenant(), customerId, body.get("opportunityId"), body.getOrDefault("contactName", ""), body.getOrDefault("followType", "电话沟通"), body.get("content"), body.getOrDefault("feedback", ""), body.getOrDefault("nextFollowPlan", ""), body.get("nextPlanDate"), body.get("followTime"), body.getOrDefault("ownerName", "开发账号"), attachments);
    }

    long countContracts(String like, String status) {
        String where = "c.tenant_id_=? AND c.delete_flag_=0 AND (c.name_ LIKE ? OR c.code_ LIKE ? OR u.name_ LIKE ?) AND (?='' OR c.status_=?)";
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_contract c JOIN t_crm_customer u ON u.id_=c.customer_id_ WHERE " + where, Long.class, tenant(), like, like, like, status, status);
    }

    List<Map<String, Object>> findContracts(String like, String status, int pageSize, int offset) {
        String where = "c.tenant_id_=? AND c.delete_flag_=0 AND (c.name_ LIKE ? OR c.code_ LIKE ? OR u.name_ LIKE ?) AND (?='' OR c.status_=?)";
        return jdbc.queryForList("SELECT c.id_ AS id,c.code_ AS code,c.name_ AS name,c.customer_id_ AS customerId,u.name_ AS customerName,c.related_product_ AS relatedProduct,c.type_ AS type,c.amount_ AS amount,c.paid_amount_ AS paidAmount,c.owner_name_ AS ownerName,c.sign_date_ AS signDate,c.effective_date_ AS effectiveDate,c.duration_months_ AS durationMonths,c.end_date_ AS endDate,c.status_ AS status,c.version_ AS version FROM t_crm_contract c JOIN t_crm_customer u ON u.id_=c.customer_id_ WHERE " + where + " ORDER BY c.create_time_ DESC LIMIT ? OFFSET ?", tenant(), like, like, like, status, status, pageSize, offset);
    }

    List<Map<String, Object>> findContract(String id) {
        return jdbc.queryForList("SELECT c.id_ AS id,c.code_ AS code,c.name_ AS name,c.customer_id_ AS customerId,u.name_ AS customerName,c.related_product_ AS relatedProduct,c.type_ AS type,c.amount_ AS amount,c.paid_amount_ AS paidAmount,c.owner_name_ AS ownerName,c.sign_date_ AS signDate,c.effective_date_ AS effectiveDate,c.duration_months_ AS durationMonths,c.end_date_ AS endDate,c.status_ AS status,c.version_ AS version FROM t_crm_contract c JOIN t_crm_customer u ON u.id_=c.customer_id_ WHERE c.id_=? AND c.tenant_id_=? AND c.delete_flag_=0", id, tenant());
    }

    List<Map<String, Object>> findPaymentStages(String contractId) {
        return jdbc.queryForList("SELECT phase_ AS phase,percentage_ AS percentage,amount_ AS amount,status_ AS status,trigger_condition_ AS triggerCondition,due_date_ AS dueDate FROM t_crm_contract_payment_stage WHERE contract_id_=? AND tenant_id_=? AND delete_flag_=0 ORDER BY due_date_", contractId, tenant());
    }

    void insertContract(String id, String code, Map<String, Object> body, String customerId, double amount) {
        jdbc.update("INSERT INTO t_crm_contract (id_,tenant_id_,code_,name_,customer_id_,related_product_,type_,amount_,paid_amount_,owner_name_,sign_date_,status_,attachments_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,0,?,COALESCE(?,CURRENT_DATE),?,'[]','dev','dev',NOW(),NOW())", id, tenant(), code, body.get("name"), customerId, body.getOrDefault("relatedProduct", "师创智联协同OS"), body.getOrDefault("type", "主合同"), amount, body.getOrDefault("ownerName", "开发账号"), body.get("signDate"), body.getOrDefault("status", "履约中"));
    }

    int updateContract(String id, Map<String, Object> body) {
        return jdbc.update("UPDATE t_crm_contract SET code_=COALESCE(?,code_),name_=COALESCE(?,name_),amount_=COALESCE(?,amount_),status_=COALESCE(?,status_),sign_date_=COALESCE(?,sign_date_),version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", body.get("code"), body.get("name"), body.get("amount"), body.get("status"), body.get("signDate"), id, tenant(), body.get("version"));
    }

    void insertPaymentStage(String contractId, Map<?, ?> stage, double percentage, double amount) {
        jdbc.update("INSERT INTO t_crm_contract_payment_stage (id_,tenant_id_,contract_id_,phase_,percentage_,amount_,status_,trigger_condition_,due_date_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())", java.util.UUID.randomUUID().toString(), tenant(), contractId, java.util.Objects.toString(stage.get("phase"), "付款阶段"), percentage, amount, java.util.Objects.toString(stage.get("status"), "未到期"), java.util.Objects.toString(stage.get("triggerCondition"), ""), java.util.Objects.toString(stage.get("dueDate"), java.time.LocalDate.now().toString()));
    }

    int customerExists(String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_customer WHERE id_=? AND tenant_id_=? AND delete_flag_=0", Integer.class, id, tenant());
    }

    long countLeads(String like, String status) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_lead l JOIN t_crm_customer c ON c.id_=l.customer_id_ WHERE l.tenant_id_=? AND l.delete_flag_=0 AND (l.name_ LIKE ? OR c.name_ LIKE ? OR l.school_contact_ LIKE ?) AND (?='' OR l.status_=?)", Long.class, tenant(), like, like, like, status, status);
    }

    List<Map<String, Object>> findLeads(String like, String status, int pageSize, int offset) {
        return jdbc.queryForList("SELECT l.id_ AS id,l.name_ AS name,l.customer_id_ AS customerId,c.name_ AS customerName,l.school_contact_ AS schoolContact,l.contact_phone_ AS contactPhone,l.department_ AS department,l.owner_name_ AS ownerName,l.source_ AS source,l.products_ AS products,l.status_ AS status,l.converted_opportunity_id_ AS convertedOpportunityId,l.create_time_ AS createdAt,l.version_ AS version FROM t_crm_lead l JOIN t_crm_customer c ON c.id_=l.customer_id_ WHERE l.tenant_id_=? AND l.delete_flag_=0 AND (l.name_ LIKE ? OR c.name_ LIKE ? OR l.school_contact_ LIKE ?) AND (?='' OR l.status_=?) ORDER BY l.create_time_ DESC LIMIT ? OFFSET ?", tenant(), like, like, like, status, status, pageSize, offset);
    }

    List<Map<String, Object>> findLead(String id) {
        return jdbc.queryForList("SELECT l.id_ AS id,l.name_ AS name,l.customer_id_ AS customerId,c.name_ AS customerName,l.school_contact_ AS schoolContact,l.contact_phone_ AS contactPhone,l.department_ AS department,l.owner_name_ AS ownerName,l.source_ AS source,l.products_ AS products,l.status_ AS status,l.converted_opportunity_id_ AS convertedOpportunityId,l.create_time_ AS createdAt,l.version_ AS version FROM t_crm_lead l JOIN t_crm_customer c ON c.id_=l.customer_id_ WHERE l.id_=? AND l.tenant_id_=? AND l.delete_flag_=0", id, tenant());
    }

    void insertLead(String id, Map<String, Object> body, String customerId, String products) {
        jdbc.update("INSERT INTO t_crm_lead (id_,tenant_id_,name_,customer_id_,school_contact_,contact_phone_,department_,owner_name_,source_,products_,status_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?, ?,?,CAST(? AS JSON),?,'dev','dev',NOW(),NOW())", id, tenant(), body.get("name"), customerId, body.get("schoolContact"), body.getOrDefault("contactPhone", ""), body.getOrDefault("department", "市场运营部"), body.getOrDefault("ownerName", "开发账号"), body.getOrDefault("source", "市场活动"), products, body.getOrDefault("status", "待确认"));
    }

    int updateLead(String id, Map<String, Object> body, String products) {
        return jdbc.update("UPDATE t_crm_lead SET name_=COALESCE(?,name_),school_contact_=COALESCE(?,school_contact_),contact_phone_=COALESCE(?,contact_phone_),department_=COALESCE(?,department_),owner_name_=COALESCE(?,owner_name_),source_=COALESCE(?,source_),products_=COALESCE(CAST(? AS JSON),products_),status_=COALESCE(?,status_),version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", body.get("name"), body.get("schoolContact"), body.get("contactPhone"), body.get("department"), body.get("ownerName"), body.get("source"), products, body.get("status"), id, tenant(), body.get("version"));
    }

    int markLeadConverted(String id, String opportunityId) {
        return jdbc.update("UPDATE t_crm_lead SET status_='转商机',converted_opportunity_id_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND status_='跟进中'", opportunityId, id, tenant());
    }

    List<Map<String, Object>> lockLead(String id) {
        return jdbc.queryForList("SELECT l.id_ AS id,l.name_ AS name,l.customer_id_ AS customerId,l.school_contact_ AS schoolContact,l.owner_name_ AS ownerName,l.products_ AS products,l.status_ AS status,l.converted_opportunity_id_ AS convertedOpportunityId FROM t_crm_lead l WHERE l.id_=? AND l.tenant_id_=? AND l.delete_flag_=0 FOR UPDATE", id, tenant());
    }

    void markCustomerEffective(String customerId) {
        jdbc.update("UPDATE t_crm_customer SET status_='有效',version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0", customerId, tenant());
    }

    Map<String, Object> dashboardSummary() {
        Number customers = jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_customer WHERE tenant_id_=? AND delete_flag_=0", Number.class, tenant());
        Number opportunityAmount = jdbc.queryForObject("SELECT COALESCE(SUM(amount_),0) FROM t_crm_opportunity WHERE tenant_id_=? AND delete_flag_=0", Number.class, tenant());
        Number opportunityCount = jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_opportunity WHERE tenant_id_=? AND delete_flag_=0", Number.class, tenant());
        Number wonCount = jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_opportunity WHERE tenant_id_=? AND delete_flag_=0 AND stage_ IN ('中标赢单','签约赢单')", Number.class, tenant());
        Number followUpCount = jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_follow_up WHERE tenant_id_=? AND delete_flag_=0", Number.class, tenant());
        Number contractCount = jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_contract WHERE tenant_id_=? AND delete_flag_=0", Number.class, tenant());
        double winRate = opportunityCount.doubleValue() == 0 ? 0 : wonCount.doubleValue() * 100 / opportunityCount.doubleValue();
        return Map.of("customerCount", customers, "opportunityAmount", opportunityAmount, "opportunityCount", opportunityCount, "wonCount", wonCount, "winRate", winRate, "followUpCount", followUpCount, "contractCount", contractCount);
    }
}
