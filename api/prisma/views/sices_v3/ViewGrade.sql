SELECT
  `g`.`id` AS `id`,
  `g`.`grade` AS `grade`,
  `g`.`type` AS `type`,
  `g`.`temporality` AS `temporality`,
  `g`.`opportunity` AS `opportunity`,
  `sices_v3`.`vs`.`curp` AS `curp`,
  `sices_v3`.`vs`.`full_name` AS `fullName`,
  `sices_v3`.`vs`.`gender` AS `gender`,
  `sices_v3`.`vs`.`student_code` AS `studentCode`,
  `c`.`class_code` AS `classCode`,
  `sp`.`subject_name` AS `subjectName`,
  `g`.`enrollment_id` AS `enrollmentId`,
  `g`.`subject_id` AS `subjectId`,
  `e`.`class_id` AS `classId`,
  `g`.`created_at` AS `createdAt`,
  `g`.`updated_at` AS `updatedAt`
FROM
  (
    (
      (
        (
          (
            `sices_v3`.`grades` `g`
            LEFT JOIN `sices_v3`.`enrollments` `e` ON((`g`.`enrollment_id` = `e`.`id`))
          )
          LEFT JOIN `sices_v3`.`view_students` `vs` ON((`e`.`student_id` = `sices_v3`.`vs`.`id`))
        )
        LEFT JOIN `sices_v3`.`classes` `c` ON((`e`.`class_id` = `c`.`id`))
      )
      LEFT JOIN `sices_v3`.`study_plans` `sp` ON((`g`.`subject_id` = `sp`.`id`))
    )
    LEFT JOIN `sices_v3`.`semesters` `sem` ON((`sp`.`semester_id` = `sem`.`id`))
  )