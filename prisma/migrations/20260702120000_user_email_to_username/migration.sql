-- 登录标识由邮箱改为账号
ALTER TABLE "User" RENAME COLUMN "email" TO "username";

-- 将种子/旧数据中的邮箱前缀转为账号（admin@example.com -> admin）
UPDATE "User"
SET "username" = substr("username", 1, instr("username", '@') - 1)
WHERE instr("username", '@') > 0;
