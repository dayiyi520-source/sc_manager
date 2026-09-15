package com.shichuang.manage.product;

import java.util.List;
import java.util.Map;

public record TaskPageResult<T>(List<T> items, int page, int pageSize, long total, List<Map<String, Object>> groups) {}
