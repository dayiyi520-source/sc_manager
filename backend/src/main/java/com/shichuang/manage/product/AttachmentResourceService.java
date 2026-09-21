package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Service
public class AttachmentResourceService {
    private final JdbcTemplate jdbc;

    public AttachmentResourceService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void bindAll(Object rawIds, String subjectType, String subjectId, String visibility) {
        if (!(rawIds instanceof Collection<?> values) || values.isEmpty()) return;
        List<String> ids = values.stream()
            .map(value -> Objects.toString(value, "").trim())
            .filter(value -> !value.isBlank())
            .distinct()
            .toList();
        if (ids.isEmpty()) return;
        for (String id : ids) {
            int updated = jdbc.update(
                "UPDATE t_product_attachment_resource SET subject_type_=?,subject_id_=?,visibility_=? WHERE tenant_id_=? AND id_=? AND create_by_=? AND subject_id_ IS NULL AND delete_flag_=0",
                subjectType, subjectId, visibility, RequestContext.tenantId(), id, RequestContext.userId()
            );
            if (updated != 1) throw new IllegalArgumentException("附件不存在或已失效");
        }
    }
}
