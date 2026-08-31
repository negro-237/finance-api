/*
  Warnings:

  - Made the column `categoryId` on table `transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_categoryId_fkey`;

-- AlterTable
ALTER TABLE `transaction` MODIFY `categoryId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Transfer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `sourceAccountId` INTEGER NOT NULL,
    `destinationAccountId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `description` VARCHAR(500) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Transfer_userId_idx`(`userId`),
    INDEX `Transfer_sourceAccountId_idx`(`sourceAccountId`),
    INDEX `Transfer_destinationAccountId_idx`(`destinationAccountId`),
    INDEX `Transfer_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_sourceAccountId_fkey` FOREIGN KEY (`sourceAccountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transfer` ADD CONSTRAINT `Transfer_destinationAccountId_fkey` FOREIGN KEY (`destinationAccountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
