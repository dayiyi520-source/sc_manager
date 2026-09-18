package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TestDomainMigrationIntegrationTest extends AbstractApiIntegrationTest {
    @Test
    void testDomainTablesAndUniqueKeysExist() {
        assertEquals(10, jdbc.queryForObject("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name IN (
              't_product_test_case_directory','t_product_test_case','t_product_test_case_step',
              't_product_test_case_work_item','t_product_test_plan','t_product_test_plan_case',
              't_product_test_execution','t_product_test_execution_case',
              't_product_test_execution_evidence','t_product_test_execution_defect')
            """, Integer.class));

        assertIndex("t_product_test_case", "uk_test_case_code");
        assertIndex("t_product_test_plan", "uk_test_plan_work_item");
        assertIndex("t_product_test_execution", "uk_test_execution_round");
        assertIndex("t_product_test_execution_defect", "uk_test_result_defect");
        assertEquals(0, jdbc.queryForObject("""
            SELECT COUNT(*) FROM t_product_line_work_item_type parent
            JOIN t_product_line_work_item_type child
              ON child.tenant_id_=parent.tenant_id_ AND child.product_line_id_=parent.product_line_id_
             AND child.category_='测试' AND child.name_ IN ('用例编写','测试任务','测试验收','安全测试','回归测试')
             AND child.enabled_=1 AND child.delete_flag_=0
            WHERE parent.category_='测试' AND parent.name_='测试任务' AND parent.enabled_=1 AND parent.delete_flag_=0
              AND NOT EXISTS (
                SELECT 1 FROM t_product_work_item_child_rule rule
                WHERE rule.tenant_id_=parent.tenant_id_ AND rule.product_line_id_=parent.product_line_id_
                  AND rule.parent_type_id_=parent.id_ AND rule.child_type_id_=child.id_
                  AND rule.enabled_=1 AND rule.delete_flag_=0
              )
            """, Integer.class));
    }

    private void assertIndex(String table, String index) {
        List<String> indexes = jdbc.queryForList("""
            SELECT DISTINCT index_name FROM information_schema.statistics
            WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
            """, String.class, table, index);
        assertEquals(List.of(index), indexes);
    }
}
