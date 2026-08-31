-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_userId_fkey`;

-- DropIndex
DROP INDEX `Category_userId_name_key` ON `category`;

-- AlterTable
ALTER TABLE `category` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `userId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Category_userId_idx` ON `Category`(`userId`);

-- CreateIndex
CREATE INDEX `Category_type_idx` ON `Category`(`type`);

-- AddForeignKey
-- ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
