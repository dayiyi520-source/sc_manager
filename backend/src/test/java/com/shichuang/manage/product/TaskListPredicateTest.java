package com.shichuang.manage.product;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaskListPredicateTest {
    @Test
    void normalizesLegacyFiltersAndCapsMultiValues() {
        TaskListFilter filter = TaskListFilter.from(Map.of(
            "status", "处理中", "ownerName", "张瑞", "groupBy", "status", "groupValue", "处理中"
        ));

        assertEquals(java.util.List.of("处理中"), filter.statuses());
        assertEquals(java.util.List.of("张瑞"), filter.owners());
        assertEquals("status", filter.groupBy());
        assertEquals("处理中", filter.groupValue());
    }

    @Test
    void buildsParameterizedExcludeDateAndGroupConditions() {
        TaskListFilter filter = TaskListFilter.from(Map.ofEntries(
            Map.entry("title", "登录"), Map.entry("titleOperator", "exclude"),
            Map.entry("statuses", "待处理,处理中"), Map.entry("statusOperator", "exclude"),
            Map.entry("createdFrom", "2026-09-20"), Map.entry("createdTo", "2026-09-01"),
            Map.entry("groupBy", "priority"), Map.entry("groupValue", "高")
        ));
        TaskListPredicate predicate = TaskListPredicate.build("tenant-a", "t", "owner_name_", filter, true);

        assertTrue(predicate.sql().contains("t.title_ NOT LIKE ?"));
        assertTrue(predicate.sql().contains("t.status_ NOT IN (?,?)"));
        assertTrue(predicate.sql().contains("DATE(t.create_time_)>=?"));
        assertTrue(predicate.sql().contains("CASE t.priority_"));
        assertFalse(predicate.sql().contains("登录"));
        assertArrayEquals(new Object[]{"tenant-a", "%登录%", "待处理", "处理中", "2026-09-01", "2026-09-20", "高"}, predicate.args());
    }

    @Test
    void rejectsUnknownGroupColumnAndUnsupportedExtendedFilter() {
        TaskListFilter filter = TaskListFilter.from(Map.of("groupBy", "status_; DROP TABLE t_sys_user", "groupValue", "处理中", "ccNames", "张瑞"));
        TaskListPredicate predicate = TaskListPredicate.build("tenant-a", "", "assignee_name_", filter, false);

        assertEquals("", filter.groupBy());
        assertTrue(predicate.sql().contains("1=0"));
        assertFalse(predicate.sql().contains("DROP"));
    }
}
