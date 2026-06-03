-- Delete Users Cleanup Script
-- Run this in Supabase SQL Editor to delete users that the Dashboard can't remove
-- The Dashboard fails because of foreign key constraints on profiles/user_organizations

-- Delete ALL users (careful!)
-- delete from auth.users where email in ('adam@gmail.com', 'admin@gmail.com');

-- Or delete a specific user:
-- First clean up dependent tables
-- delete from user_organizations where user_id = (select id from auth.users where email = 'adam@gmail.com');
-- delete from profiles where id = (select id from auth.users where email = 'adam@gmail.com');
-- delete from auth.users where email = 'adam@gmail.com';
