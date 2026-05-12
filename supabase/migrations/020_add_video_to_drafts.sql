-- Add video_url field to content_drafts for TikTok support
ALTER TABLE content_drafts ADD COLUMN video_url text;
