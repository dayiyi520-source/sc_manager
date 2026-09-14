package com.shichuang.manage.product;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ProductVersionDatesTest {
    @Test void emptyDatesBecomeNullAndMissingDatesRemainAbsent() {
        var result = ProductLineService.normalizeVersionDates(Map.of("startDate", "  "), Map.of());
        assertTrue(result.containsKey("startDate"));
        assertNull(result.get("startDate"));
        assertFalse(result.containsKey("endDate"));
    }
    @Test void invalidCalendarDateIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> ProductLineService.normalizeVersionDates(
            Map.of("startDate", "2026-02-30"), Map.of()));
    }
    @Test void partialUpdateChecksExistingOtherDate() {
        assertThrows(IllegalArgumentException.class, () -> ProductLineService.normalizeVersionDates(
            Map.of("endDate", "2026-09-01"), Map.of("startDate", "2026-09-14")));
    }
    @Test void clearingDateAndSameDayRangeAreAllowed() {
        assertNull(ProductLineService.normalizeVersionDates(Map.of("startDate", ""),
            Map.of("startDate", "2026-09-14", "endDate", "2026-09-15")).get("startDate"));
        assertDoesNotThrow(() -> ProductLineService.normalizeVersionDates(
            Map.of("startDate", "2026-09-14", "endDate", "2026-09-14"), Map.of()));
    }
}
