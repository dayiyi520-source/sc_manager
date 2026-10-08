package com.shichuang.manage.product;

import java.math.BigDecimal;
import java.util.*;

/** Business fields only: revision and audit timestamps are not task changes. */
final class TaskActivityChanges {
    private static final List<String> FIELDS=List.of("title","description","descriptionHtml","expectedGoal","versionId","versionName","assigneeName","ownerName","priority","plannedStartDate","plannedEndDate","dueDate","expectedCompleteDate","estimatedHours","actualHours","customerId","customerName","ccNames","media","requirementType","status","severity","type","env","specialFields");
    static List<Map<String,Object>> between(Map<String,Object> before,Map<String,Object> after) {
        List<Map<String,Object>> result=new ArrayList<>();
        for(String field:FIELDS) {
            if(field.equals("ownerName") && (before.containsKey("assigneeName") || after.containsKey("assigneeName"))) continue;
            if(field.equals("dueDate") && (before.containsKey("plannedEndDate") || after.containsKey("plannedEndDate"))) continue;
            if(field.equals("descriptionHtml") && !equal(before.get("description"),after.get("description"))) continue;
            Object from=before.get(field),to=after.get(field);
            if(!equal(from,to)) result.add(Map.of("field",field,"from",from==null?"":from,"to",to==null?"":to));
        }
        return result;
    }
    private static boolean equal(Object from,Object to) {
        if(from instanceof Number && to instanceof Number) return new BigDecimal(from.toString()).compareTo(new BigDecimal(to.toString()))==0;
        return Objects.equals(Objects.toString(from,""),Objects.toString(to,""));
    }
    private TaskActivityChanges() {}
}
