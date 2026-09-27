ALTER TABLE t_product_line
  ADD COLUMN requirement_owner_secondary_ VARCHAR(128) NULL AFTER requirement_owner_,
  ADD COLUMN requirement_owner_secondary_user_id_ VARCHAR(36) NULL AFTER requirement_owner_user_id_,
  ADD COLUMN tech_owner_secondary_ VARCHAR(128) NULL AFTER tech_owner_,
  ADD COLUMN tech_owner_secondary_user_id_ VARCHAR(36) NULL AFTER tech_owner_user_id_,
  ADD COLUMN test_owner_secondary_ VARCHAR(128) NULL AFTER test_owner_,
  ADD COLUMN test_owner_secondary_user_id_ VARCHAR(36) NULL AFTER test_owner_user_id_,
  ADD INDEX idx_product_line_secondary_owners (tenant_id_, requirement_owner_secondary_user_id_, tech_owner_secondary_user_id_, test_owner_secondary_user_id_, delete_flag_);
