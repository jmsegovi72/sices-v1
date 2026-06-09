SELECT
  `sices_v3`.`vs`.`id` AS `id`,
  `sices_v3`.`vs`.`personId` AS `personId`,
  `sices_v3`.`vs`.`curp` AS `curp`,
  `sices_v3`.`vs`.`firstName` AS `firstName`,
  `sices_v3`.`vs`.`firstLastName` AS `firstLastName`,
  `sices_v3`.`vs`.`secondLastName` AS `secondLastName`,
  `sices_v3`.`vs`.`fullName` AS `fullName`,
  `sices_v3`.`vs`.`gender` AS `gender`,
  `sices_v3`.`vs`.`birthDate` AS `birthDate`,
  `sices_v3`.`vs`.`employeeAge` AS `employeeAge`,
  `sices_v3`.`vs`.`institutionalMail` AS `institutionalMail`,
  `sices_v3`.`vs`.`paymentUniqueKey` AS `paymentUniqueKey`,
  `sices_v3`.`vs`.`systemEntryDate` AS `systemEntryDate`,
  `sices_v3`.`vs`.`schoolEntryDate` AS `schoolEntryDate`,
  `sices_v3`.`vs`.`isActive` AS `isActive`,
  `sices_v3`.`vs`.`staffStatus` AS `staffStatus`,
  `sices_v3`.`vs`.`systemYears` AS `systemYears`,
  `sices_v3`.`vs`.`schoolYears` AS `schoolYears`,
  `sices_v3`.`vs`.`staffTypeName` AS `staffType`,
  `sices_v3`.`vs`.`employmentTypeName` AS `employmentType`,
  `sices_v3`.`vs`.`employmentDurationName` AS `employmentDuration`,
  `sices_v3`.`vs`.`responsibilityName` AS `responsibility`,
  `sices_v3`.`vs`.`categoryName` AS `category`,
  `sices_v3`.`vs`.`titleKey` AS `titleKey`,
  `sices_v3`.`vs`.`staffTypeId` AS `staffTypeId`,
  `sices_v3`.`vs`.`employmentTypeId` AS `employmentTypeId`,
  `sices_v3`.`vs`.`employmentDurationId` AS `employmentDurationId`,
  `sices_v3`.`vs`.`responsibilityId` AS `responsibilityId`,
  `sices_v3`.`vs`.`categoryId` AS `categoryId`,
  `sices_v3`.`vap`.`educationLevel` AS `educationLevel`,
  `sices_v3`.`vap`.`isGraduate` AS `isGraduate`,
  `sices_v3`.`vap`.`graduationDate` AS `graduationDate`,
  `sices_v3`.`vap`.`schoolOfOrigin` AS `schoolOfOrigin`,
  `sices_v3`.`vap`.`fundingSource` AS `fundingSource`,
  `sices_v3`.`vap`.`knowledgeArea` AS `knowledgeArea`,
  `sices_v3`.`vap`.`discipline` AS `discipline`,
  `sices_v3`.`vap`.`sniLevel` AS `sniLevel`,
  `sices_v3`.`vap`.`researchProject` AS `researchProject`,
  `sices_v3`.`vap`.`thesisTopic` AS `thesisTopic`,
  `sices_v3`.`vap`.`hasDoneStay` AS `hasDoneStay`,
  `sices_v3`.`vap`.`educationLevelId` AS `educationLevelId`,
  `sices_v3`.`vap`.`schoolOfOriginId` AS `schoolOfOriginId`,
  `sices_v3`.`vap`.`knowledgeAreaId` AS `knowledgeAreaId`,
  `sices_v3`.`vap`.`disciplineId` AS `disciplineId`
FROM
  (
    `sices_v3`.`view_staff` `vs`
    LEFT JOIN `sices_v3`.`view_staff_academic_profile` `vap` ON(
      (
        `sices_v3`.`vs`.`id` = `sices_v3`.`vap`.`staffId`
      )
    )
  )