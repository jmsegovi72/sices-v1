SELECT
  `sw`.`id` AS `id`,
  `sw`.`withdrawal_date` AS `dropoutDate`,
  `ss`.`status_key` AS `studentStatusKey`,
  `ss`.`description` AS `studentStatus`,
  `s`.`code_number` AS `studentCode`,
  `sices_v3`.`vp`.`full_name` AS `studentFullName`,
  `sices_v3`.`vp`.`curp` AS `studentCurp`,
  `c`.`class_code` AS `classCode`,
  `sap`.`semiannual_period` AS `semiannualPeriod`,
  `sem`.`number` AS `semester`,
  `sices_v3`.`vep`.`offeredEducationLevel` AS `educationLevel`,
  `sices_v3`.`vep`.`name` AS `educationalProgram`,
  `sices_v3`.`vep`.`academicDiscipline` AS `academicDiscipline`,
  `wr`.`reason` AS `reasonForDropout`,
  `sw`.`enrollment_id` AS `enrollmentId`,
  `sw`.`student_status_id` AS `studentStatusId`,
  `sw`.`withdrawal_reason_id` AS `withdrawalReasonId`,
  `sw`.`created_at` AS `createdAt`,
  `sw`.`updated_at` AS `updatedAt`
FROM
  (
    (
      (
        (
          (
            (
              (
                (
                  (
                    `sices_v3`.`student_withdrawals` `sw`
                    LEFT JOIN `sices_v3`.`enrollments` `e` ON((`sw`.`enrollment_id` = `e`.`id`))
                  )
                  LEFT JOIN `sices_v3`.`classes` `c` ON((`e`.`class_id` = `c`.`id`))
                )
                LEFT JOIN `sices_v3`.`students` `s` ON((`e`.`student_id` = `s`.`id`))
              )
              LEFT JOIN `sices_v3`.`view_persons` `vp` ON((`s`.`person_id` = `sices_v3`.`vp`.`id`))
            )
            LEFT JOIN `sices_v3`.`student_status` `ss` ON((`sw`.`student_status_id` = `ss`.`id`))
          )
          LEFT JOIN `sices_v3`.`withdrawal_reasons` `wr` ON((`sw`.`withdrawal_reason_id` = `wr`.`id`))
        )
        LEFT JOIN `sices_v3`.`semiannual_periods` `sap` ON((`c`.`semiannual_period_id` = `sap`.`id`))
      )
      LEFT JOIN `sices_v3`.`view_educational_programs` `vep` ON(
        (
          `c`.`educational_program_id` = `sices_v3`.`vep`.`id`
        )
      )
    )
    LEFT JOIN `sices_v3`.`semesters` `sem` ON((`c`.`semester_id` = `sem`.`id`))
  )