package com.shichuang.manage.product;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RequirementStatusPolicyTest {
    @Test
    void onlyPendingRequirementsCanBeHeld() {
        assertTrue(RequirementStatusPolicy.canHold("待处理"));
        assertFalse(RequirementStatusPolicy.canHold("已搁置"));
        assertFalse(RequirementStatusPolicy.canHold("处理中"));
    }

    @Test
    void pendingAndHeldRequirementsCanBeRejected() {
        assertTrue(RequirementStatusPolicy.canReject("待处理"));
        assertTrue(RequirementStatusPolicy.canReject("已搁置"));
        assertFalse(RequirementStatusPolicy.canReject("处理中"));
        assertFalse(RequirementStatusPolicy.canReject("已完成"));
    }

    @Test
    void pendingAndHeldRequirementsCanCreateWorkItems() {
        assertTrue(RequirementStatusPolicy.canCreateWorkItem("待处理"));
        assertTrue(RequirementStatusPolicy.canCreateWorkItem("已搁置"));
        assertFalse(RequirementStatusPolicy.canCreateWorkItem("处理中"));
        assertFalse(RequirementStatusPolicy.canCreateWorkItem("已驳回"));
    }
}
