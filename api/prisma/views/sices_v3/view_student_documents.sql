SELECT
  `sd`.`id` AS `id`,
  `s`.`code_number` AS `studentCode`,
  `sices_v3`.`vp`.`fullName` AS `studentName`,
  `sices_v3`.`vp`.`curp` AS `studentCurp`,
  `dt`.`name` AS `documentName`,
  `sd`.`delivery_date` AS `deliveryDate`,
  `sd`.`file_path` AS `filePath`,
  `sd`.`notes` AS `notes`,
  `sices_v3`.`vu_created`.`fullName` AS `createdByName`,
  `sices_v3`.`vu_updated`.`fullName` AS `updatedByName`,
  `sd`.`student_id` AS `studentId`,
  `sd`.`document_type_id` AS `documentTypeId`
FROM
  (
    (
      (
        (
          (
            `sices_v3`.`student_documents` `sd`
            JOIN `sices_v3`.`students` `s` ON((`sd`.`student_id` = `s`.`id`))
          )
          JOIN `sices_v3`.`view_persons` `vp` ON((`s`.`person_id` = `sices_v3`.`vp`.`id`))
        )
        JOIN `sices_v3`.`document_types` `dt` ON((`sd`.`document_type_id` = `dt`.`id`))
      )
      JOIN `sices_v3`.`view_users` `vu_created` ON(
        (`sd`.`created_by` = `sices_v3`.`vu_created`.`id`)
      )
    )
    JOIN `sices_v3`.`view_users` `vu_updated` ON(
      (`sd`.`updated_by` = `sices_v3`.`vu_updated`.`id`)
    )
  )