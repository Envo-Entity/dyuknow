-- Lets the service-role seed script insert profile rows (generated columns and checks call these).
grant usage on schema private to service_role;
grant execute on function private.postcode_area(text), private.valid_free_text_items(text[]) to service_role;
