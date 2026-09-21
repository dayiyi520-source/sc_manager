ALTER TABLE t_product_version_review
  ADD COLUMN meeting_time_ DATETIME(6) NULL,
  ADD COLUMN related_tasks_ TEXT NULL,
  ADD COLUMN agenda_conclusion_ TEXT NULL,
  ADD COLUMN remaining_issues_ TEXT NULL,
  ADD COLUMN attachments_ LONGTEXT NULL;
