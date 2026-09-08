package com.shichuang.manage.crm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.api.PageResult;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.Set;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class CrmService {
    private static final Set<String> CUSTOMER_TYPES = Set.of("高校", "教育主管单位", "其他");
    private final CrmMapper mapper;
    private final ObjectMapper objectMapper;

    public CrmService(CrmMapper mapper, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    public PageResult<Map<String, Object>> customers(int page, int pageSize, String keyword, String type, String level) {
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(100, Math.max(1, pageSize));
        String like = "%" + keyword + "%";
        long total = mapper.countCustomers(like, type, level);
        return new PageResult<>(mapper.findCustomers(like, type, level, normalizedSize, (normalizedPage - 1) * normalizedSize), normalizedPage, normalizedSize, total);
    }

    public Map<String, Object> customer(String id) {
        List<Map<String, Object>> rows = mapper.findCustomer(id);
        if (rows.isEmpty()) throw notFound("客户不存在");
        return rows.get(0);
    }

    public Map<String, Object> createCustomer(Map<String, Object> body) {
        validateCustomerType(body.get("type"));
        String id = UUID.randomUUID().toString();
        String code = Objects.toString(body.getOrDefault("code", "CUST-" + System.currentTimeMillis()));
        mapper.insertCustomer(id, code, body, jsonArray(body.getOrDefault("tags", List.of()), "客户标签格式无效"));
        return Map.of("id", id, "code", code);
    }

    public PageResult<Map<String, Object>> journey(int page, int pageSize, String customerId, String leadId, String opportunityId, String requirementId, String workItemId) {
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(100, Math.max(1, pageSize));
        String normalizedCustomerId = safe(customerId);
        String normalizedLeadId = safe(leadId);
        String normalizedOpportunityId = safe(opportunityId);
        String normalizedRequirementId = safe(requirementId);
        String normalizedWorkItemId = safe(workItemId);
        long total = mapper.countJourney(normalizedCustomerId, normalizedLeadId, normalizedOpportunityId, normalizedRequirementId, normalizedWorkItemId);
        List<Map<String, Object>> items = mapper.findJourney(normalizedCustomerId, normalizedLeadId, normalizedOpportunityId, normalizedRequirementId, normalizedWorkItemId, normalizedSize, (normalizedPage - 1) * normalizedSize);
        return new PageResult<>(items, normalizedPage, normalizedSize, total);
    }

    public PageResult<Map<String, Object>> leads(int page, int pageSize, String keyword, String status) {
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(100, Math.max(1, pageSize));
        String like = "%" + keyword + "%";
        long total = mapper.countLeads(like, status);
        List<Map<String, Object>> items = mapper.findLeads(like, status, normalizedSize, (normalizedPage - 1) * normalizedSize);
        items.forEach(item -> item.put("products", parseJsonArray(item.get("products"))));
        return new PageResult<>(items, normalizedPage, normalizedSize, total);
    }

    public Map<String, Object> createLead(Map<String, Object> body) {
        String customerId = Objects.toString(body.get("customerId"), "");
        ensureCustomer(customerId);
        if (Objects.toString(body.get("name"), "").isBlank() || Objects.toString(body.get("schoolContact"), "").isBlank()) throw new IllegalArgumentException("线索名称和学校联系人不能为空");
        String products = jsonArray(body.getOrDefault("products", List.of()), "意向产品格式无效");
        String id = UUID.randomUUID().toString();
        mapper.insertLead(id, body, customerId, products);
        return Map.of("id", id);
    }

    public void updateLead(String id, Map<String, Object> body) {
        String products = body.containsKey("products") ? jsonArray(body.get("products"), "意向产品格式无效") : null;
        if (mapper.updateLead(id, body, products) == 0) throw conflict("线索已变化，请刷新后重试");
    }

    @Transactional
    public Map<String, Object> convertLead(String id, Map<String, Object> body) {
        List<Map<String, Object>> rows = mapper.lockLead(id);
        Map<String, Object> lead = rows.stream().findFirst().orElseThrow(() -> notFound("线索不存在"));
        if (!"跟进中".equals(lead.get("status"))) {
            if ("转商机".equals(lead.get("status")) && lead.get("convertedOpportunityId") != null) return Map.of("id", lead.get("convertedOpportunityId"));
            throw conflict("线索已废弃，不能转为商机");
        }
        Map<String, Object> opportunityBody = new java.util.HashMap<>(body);
        opportunityBody.putIfAbsent("name", lead.get("name"));
        opportunityBody.put("customerId", lead.get("customerId"));
        opportunityBody.put("leadId", id);
        opportunityBody.put("relatedProduct", body.getOrDefault("relatedProduct", parseJsonArray(lead.get("products")).stream().findFirst().orElse("待确认产品")));
        opportunityBody.put("ownerName", body.getOrDefault("ownerName", lead.get("ownerName")));
        Map<String, Object> result = createOpportunity(opportunityBody);
        if (mapper.markLeadConverted(id, Objects.toString(result.get("id"), "")) == 0) throw conflict("线索已被其他人转化，请刷新后重试");
        mapper.markCustomerEffective(Objects.toString(lead.get("customerId"), ""));
        return result;
    }

    public void updateCustomer(String id, Map<String, Object> body) {
        if (body.containsKey("type")) validateCustomerType(body.get("type"));
        String tags = body.containsKey("tags") ? jsonArray(body.get("tags"), "客户标签格式无效") : null;
        if (mapper.updateCustomer(id, body, tags) == 0) throw conflict("客户档案已变化，请刷新后重试");
    }

    public PageResult<Map<String, Object>> opportunities(int page, int pageSize, String keyword, String stage) {
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(100, Math.max(1, pageSize));
        String like = "%" + keyword + "%";
        long total = mapper.countOpportunities(like, stage);
        return new PageResult<>(mapper.findOpportunities(like, stage, normalizedSize, (normalizedPage - 1) * normalizedSize), normalizedPage, normalizedSize, total);
    }

    public Map<String, Object> opportunity(String id) {
        List<Map<String, Object>> rows = mapper.findOpportunity(id);
        if (rows.isEmpty()) throw notFound("商机不存在");
        return rows.get(0);
    }

    public Map<String, Object> createOpportunity(Map<String, Object> body) {
        String customerId = Objects.toString(body.get("customerId"), "");
        ensureCustomer(customerId);
        if (Objects.toString(body.get("leadId"), "").isBlank()) throw new IllegalArgumentException("商机必须由线索转化产生");
        List<Map<String, Object>> sourceLeads = mapper.findLead(Objects.toString(body.get("leadId"), ""));
        if (sourceLeads.isEmpty()) throw notFound("来源线索不存在");
        if (!"跟进中".equals(sourceLeads.get(0).get("status"))) throw conflict("来源线索已完成转化或已废弃");
        String id = UUID.randomUUID().toString();
        mapper.insertOpportunity(id, body, customerId);
        return Map.of("id", id);
    }

    public void updateOpportunity(String id, Map<String, Object> body) {
        if (mapper.updateOpportunity(id, body) == 0) throw conflict("记录已被其他人更新，请刷新后重试");
    }

    @Transactional
    public void transitionOpportunity(String id, Map<String, Object> body) {
        String stage = Objects.toString(body.get("stage"), "");
        if (stage.isBlank()) throw new IllegalArgumentException("阶段不能为空");
        if (mapper.transitionOpportunity(id, stage, body.get("version")) == 0) throw conflict("阶段已被其他人更新，请刷新后重试");
        if ("招投标".equals(stage)) {
            Map<String, Object> opportunity = mapper.opportunityLifecycle(id);
            if (opportunity != null && mapper.findBiddingByOpportunity(id) == null) mapper.insertBidding(UUID.randomUUID().toString(), opportunity, body);
        }
    }

    @Transactional
    public Map<String, Object> updateBidding(String id, Map<String, Object> body) {
        Map<String, Object> existing = mapper.findBiddingByOpportunity(id);
        if (existing == null) throw notFound("招投标记录不存在");
        String biddingId = Objects.toString(existing.get("id"));
        if (mapper.updateBidding(biddingId, Objects.toString(body.get("status"), ""), Objects.toString(body.get("result"), ""), body.get("version")) == 0) throw conflict("招投标记录已变化，请刷新后重试");
        if ("中标".equals(body.get("result")) || "中标".equals(body.get("status"))) {
            Map<String, Object> engagement = mapper.bidding(biddingId);
            if (engagement == null) {
                Map<String, Object> payload = new java.util.HashMap<>(existing);
                payload.putAll(body);
                mapper.insertEngagement(UUID.randomUUID().toString(), payload, body);
            }
        }
        return Map.of("id", biddingId);
    }

    @Transactional
    public Map<String, Object> updateEngagement(String id, Map<String, Object> body) {
        Map<String, Object> engagement = mapper.engagement(id);
        if (engagement == null) throw notFound("中标接洽记录不存在");
        if (mapper.updateEngagement(id, Objects.toString(body.get("status"), ""), body.get("version")) == 0) throw conflict("中标接洽记录已变化，请刷新后重试");
        if ("已签约".equals(body.get("status")) || "签约完成".equals(body.get("status"))) {
            if (mapper.findProjectByEngagement(id) == null) mapper.insertProject(UUID.randomUUID().toString(), engagement, body);
        }
        return Map.of("id", id);
    }

    public PageResult<Map<String,Object>> biddings(int page, int pageSize) { int p=Math.max(1,page), s=Math.min(100,Math.max(1,pageSize)); return new PageResult<>(mapper.findBiddings(s,(p-1)*s),p,s,mapper.countBiddings()); }
    public PageResult<Map<String,Object>> engagements(int page, int pageSize) { int p=Math.max(1,page), s=Math.min(100,Math.max(1,pageSize)); return new PageResult<>(mapper.findEngagements(s,(p-1)*s),p,s,mapper.countEngagements()); }
    public PageResult<Map<String,Object>> projects(int page, int pageSize) { int p=Math.max(1,page), s=Math.min(100,Math.max(1,pageSize)); return new PageResult<>(mapper.findProjects(s,(p-1)*s),p,s,mapper.countProjects()); }

    public PageResult<Map<String, Object>> followUps(int page, int pageSize, String keyword, String customerId, String opportunityId, String from, String to) {
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(100, Math.max(1, pageSize));
        String like = "%" + keyword + "%";
        Object fromValue = from.isBlank() ? null : from;
        Object toValue = to.isBlank() ? null : to;
        String customerValue = customerId.isBlank() ? null : customerId;
        String opportunityValue = opportunityId.isBlank() ? null : opportunityId;
        long total = mapper.countFollowUps(like, customerValue, opportunityValue, fromValue, toValue);
        return new PageResult<>(mapper.findFollowUps(like, customerValue, opportunityValue, fromValue, toValue, normalizedSize, (normalizedPage - 1) * normalizedSize), normalizedPage, normalizedSize, total);
    }

    public Map<String, Object> followUp(String id) {
        List<Map<String, Object>> rows = mapper.findFollowUp(id);
        if (rows.isEmpty()) throw notFound("跟进记录不存在");
        return rows.get(0);
    }

    public Map<String, Object> createFollowUp(Map<String, Object> body) {
        String customerId = Objects.toString(body.get("customerId"), "");
        ensureCustomer(customerId);
        if (Objects.toString(body.get("content"), "").isBlank()) throw new IllegalArgumentException("跟进内容不能为空");
        String attachments = jsonArray(body.getOrDefault("attachments", List.of()), "附件格式无效");
        String id = UUID.randomUUID().toString();
        mapper.insertFollowUp(id, body, customerId, attachments);
        return Map.of("id", id);
    }

    public PageResult<Map<String, Object>> contracts(int page, int pageSize, String keyword, String status) {
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(100, Math.max(1, pageSize));
        String like = "%" + keyword + "%";
        long total = mapper.countContracts(like, status);
        return new PageResult<>(mapper.findContracts(like, status, normalizedSize, (normalizedPage - 1) * normalizedSize), normalizedPage, normalizedSize, total);
    }

    public Map<String, Object> contract(String id) {
        List<Map<String, Object>> rows = mapper.findContract(id);
        if (rows.isEmpty()) throw notFound("合同不存在");
        Map<String, Object> result = new java.util.LinkedHashMap<>(rows.get(0));
        result.put("paymentStages", mapper.findPaymentStages(id));
        return result;
    }

    @Transactional
    public Map<String, Object> createContract(Map<String, Object> body) {
        String customerId = Objects.toString(body.get("customerId"), "");
        ensureCustomer(customerId);
        double amount = ((Number) body.getOrDefault("amount", 0)).doubleValue();
        Object stages = body.getOrDefault("paymentStages", List.of());
        if (stages instanceof List<?> list) {
            double sum = list.stream().mapToDouble(value -> {
                Object percentage = ((Map<?, ?>) value).get("percentage");
                return percentage instanceof Number number ? number.doubleValue() : 0;
            }).sum();
            if (!list.isEmpty() && Math.abs(sum - 100) > 0.01) throw new IllegalArgumentException("付款比例总和必须为100%");
        }
        String id = UUID.randomUUID().toString();
        String code = Objects.toString(body.getOrDefault("code", "HT-" + System.currentTimeMillis()));
        mapper.insertContract(id, code, body, customerId, amount);
        if (stages instanceof List<?> list) saveStages(id, list, amount);
        return Map.of("id", id, "code", code);
    }

    public void updateContract(String id, Map<String, Object> body) {
        if (mapper.updateContract(id, body) == 0) throw conflict("合同已变化，请刷新后重试");
    }

    public Map<String, Object> dashboardSummary() {
        return mapper.dashboardSummary();
    }

    private void saveStages(String contractId, List<?> stages, double contractAmount) {
        for (Object value : stages) {
            Map<?, ?> stage = (Map<?, ?>) value;
            double percentage = ((Number) stage.get("percentage")).doubleValue();
            double amount = stage.get("amount") instanceof Number number ? number.doubleValue() : contractAmount * percentage / 100;
            mapper.insertPaymentStage(contractId, stage, percentage, amount);
        }
    }

    private void ensureCustomer(String id) {
        if (id.isBlank() || mapper.customerExists(id) == 0) throw new IllegalArgumentException("关联客户不存在");
    }

    private String jsonArray(Object value, String message) {
        if (!(value instanceof Collection<?>)) throw new IllegalArgumentException(message);
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception error) {
            throw new IllegalArgumentException(message, error);
        }
    }

    private void validateCustomerType(Object value) {
        if (value != null && !CUSTOMER_TYPES.contains(Objects.toString(value, ""))) {
            throw new IllegalArgumentException("客户类型仅支持高校、教育主管单位或其他");
        }
    }

    private static String safe(String value) { return value == null ? "" : value.trim(); }

    private List<String> parseJsonArray(Object value) {
        if (value instanceof Collection<?> collection) return collection.stream().map(String::valueOf).toList();
        if (value instanceof String text) {
            try { return objectMapper.readValue(text, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)); } catch (Exception ignored) { return List.of(); }
        }
        return List.of();
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
