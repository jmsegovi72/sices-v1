SELECT
  `d`.`id` AS `id`,
  `sices_v3`.`vp`.`fullName` AS `personName`,
  `sices_v3`.`vp`.`curp` AS `personCurp`,
  `s`.`code_number` AS `studentCode`,
  `st`.`id` AS `staffId`,
  `st`.`staff_type_id` AS `staffTypeId`,
  `dt`.`name` AS `documentName`,
  `d`.`delivery_date` AS `deliveryDate`,
  `d`.`file_path` AS `filePath`,
  `d`.`mime_type` AS `mimeType`,
  `d`.`notes` AS `notes`,
  `sices_v3`.`vu_created`.`fullName` AS `createdByName`,
  `sices_v3`.`vu_updated`.`fullName` AS `updatedByName`,
  `d`.`person_id` AS `personId`,
  `d`.`student_id` AS `studentId`,
  `d`.`staff_id` AS `staffIdRef`,
  `d`.`document_type_id` AS `documentTypeId`
FROM
  (
    (
      (
        (
          (
            (
              `sices_v3`.`documents` `d`
              JOIN `sices_v3`.`view_persons` `vp` ON((`d`.`person_id` = `sices_v3`.`vp`.`id`))
            )
            LEFT JOIN `sices_v3`.`students` `s` ON((`d`.`student_id` = `s`.`id`))
          )
          LEFT JOIN `sices_v3`.`staff` `st` ON((`d`.`staff_id` = `st`.`id`))
        )
        JOIN `sices_v3`.`document_types` `dt` ON((`d`.`document_type_id` = `dt`.`id`))
      )
      JOIN `sices_v3`.`view_users` `vu_created` ON(
        (`d`.`created_by` = `sices_v3`.`vu_created`.`id`)
      )
    )
    JOIN `sices_v3`.`view_users` `vu_updated` ON(
      (`d`.`updated_by` = `sices_v3`.`vu_updated`.`id`)
    )
  )