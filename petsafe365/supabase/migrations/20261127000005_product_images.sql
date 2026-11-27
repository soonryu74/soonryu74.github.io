-- 상품에 공급사 상품코드와 사진 경로를 둔다.
alter table public.products add column sku text, add column image_url text;
