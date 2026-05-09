-- posts tablosuna platform_post_id unique constraint ekle (upsert için gerekli)
ALTER TABLE posts ADD CONSTRAINT posts_platform_post_id_unique UNIQUE (platform_post_id);
