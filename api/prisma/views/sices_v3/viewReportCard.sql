SELECT
  `sices_v3`.`vg`.`curp` AS `curp`,
  `sices_v3`.`vg`.`fullName` AS `fullName`,
  `sices_v3`.`vg`.`studentCode` AS `studentCode`,
  `sices_v3`.`vg`.`classCode` AS `classCode`,
  `c`.`group` AS `group`,
  `c`.`shift` AS `shift`,
  `sices_v3`.`vg`.`subjectName` AS `subjectName`,
  `sices_v3`.`vg`.`subjectId` AS `subjectId`,
  `sem`.`number` AS `semester`,
  `sices_v3`.`vg`.`grade` AS `finalGrade`,
  `sices_v3`.`vg`.`opportunity` AS `opportunity`,
  `sices_v3`.`vstp`.`fullName` AS `teacherName`,
  `sices_v3`.`vstp`.`titleKey` AS `teacherTitle`,
  `sices_v3`.`vstp`.`gender` AS `teacherGender`,
  `sices_v3`.`vep`.`name` AS `educationalProgram`,
  `sices_v3`.`vep`.`studyPlan` AS `studyPlan`,
  `sap`.`semiannual_period` AS `semiannualPeriod`,
  `sy`.`school_year` AS `schoolYear`
FROM
  (
    (
      (
        (
          (
            (
              (
                (
                  `sices_v3`.`view_grades` `vg`
                  LEFT JOIN `sices_v3`.`classes` `c` ON((`sices_v3`.`vg`.`classId` = `c`.`id`))
                )
                LEFT JOIN `sices_v3`.`study_plans` `sp` ON((`sices_v3`.`vg`.`subjectId` = `sp`.`id`))
              )
              LEFT JOIN `sices_v3`.`semesters` `sem` ON((`sp`.`semester_id` = `sem`.`id`))
            )
            LEFT JOIN `sices_v3`.`teaching_load` `tl` ON(
              (
                (`sices_v3`.`vg`.`classId` = `tl`.`class_id`)
                AND (
                  `sices_v3`.`vg`.`subjectId` = `tl`.`study_plan_id`
                )
              )
            )
          )
          LEFT JOIN `sices_v3`.`view_staff_teaching_profile` `vstp` ON(
            (
              `tl`.`staff_teaching_profile_id` = `sices_v3`.`vstp`.`id`
            )
          )
        )
        LEFT JOIN `sices_v3`.`view_educational_programs` `vep` ON(
          (
            `c`.`educational_program_id` = `sices_v3`.`vep`.`id`
          )
        )
      )
      LEFT JOIN `sices_v3`.`semiannual_periods` `sap` ON((`c`.`semiannual_period_id` = `sap`.`id`))
    )
    LEFT JOIN `sices_v3`.`school_years` `sy` ON((`c`.`school_year_id` = `sy`.`id`))
  )
WHERE
  (`sices_v3`.`vg`.`temporality` = 'FINAL')