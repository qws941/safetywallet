-- Remove PII name masking: copy real name into name_masked column
UPDATE users SET name_masked = name WHERE name_masked != name;
