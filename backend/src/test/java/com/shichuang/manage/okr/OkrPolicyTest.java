package com.shichuang.manage.okr;

import com.shichuang.manage.okr.service.OkrPolicy;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class OkrPolicyTest {
    @Test void rejectsPeerOrSelfAsParent() {
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.requireParent("me", "boss", "peer", "active", false));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.requireParent("me", "me", "me", "active", false));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.requireParent("me", null, null, "active", false));
    }
    @Test void requiresActiveSupervisorAndAllowsExplicitRoot() {
        assertDoesNotThrow(() -> OkrPolicy.requireParent("me", "boss", "boss", "active", false));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.requireParent("me", "boss", "boss", "archived", false));
        assertDoesNotThrow(() -> OkrPolicy.requireParent("root", null, null, null, true));
    }
    @Test void computesWeightedProgressAndRetainsZero() {
        assertEquals(65, OkrPolicy.progress(List.of(30,70), List.of(100,50)));
        assertEquals(0, OkrPolicy.progress(List.of(100), List.of(0)));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.progress(List.of(100), List.of(101)));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.weights(List.of(50,40)));
    }
    @Test void ownerCannotApproveAndReturnAllowsResubmission() {
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.transition("review","submitted","approve",true,false));
        assertEquals("returned", OkrPolicy.transition("review","submitted","return",false,true));
        assertEquals("submitted", OkrPolicy.transition("review","returned","submit",true,false));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.transition("review","archived","submit",true,false));
    }
    @Test void rejectsInvalidPeriods() {
        var start = LocalDate.of(2026,9,1);
        assertDoesNotThrow(() -> OkrPolicy.period(start,start.plusDays(29)));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.period(start,start.minusDays(1)));
        assertThrows(IllegalArgumentException.class, () -> OkrPolicy.period(start,start.plusMonths(2)));
    }
}
