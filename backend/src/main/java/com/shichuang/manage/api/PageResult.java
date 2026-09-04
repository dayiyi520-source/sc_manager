package com.shichuang.manage.api;

import java.util.List;

public record PageResult<T>(List<T> items, int page, int pageSize, long total) {}
