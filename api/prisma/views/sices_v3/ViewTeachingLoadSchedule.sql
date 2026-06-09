SELECT
  `tls`.`id` AS `id`,
  `sices_v3`.`vtl`.`fullName` AS `fullName`,
  `sices_v3`.`vtl`.`curp` AS `curp`,
  `sices_v3`.`vtl`.`titleKey` AS `titleKey`,
  `sices_v3`.`vtl`.`gender` AS `gender`,
  `sices_v3`.`vtl`.`subjectName` AS `subjectName`,
  `sp`.`subject_key` AS `subjectKey`,
  `sices_v3`.`vtl`.`classKey` AS `classKey`,
  `sp`.`display_order` AS `subjectOrder`,
  `sem`.`number` AS `semester`,
  `wd`.`day_key` AS `day`,
  `wd`.`sort_order` AS `dayOrder`,
  `wh`.`hour_key` AS `hour`,
  `c`.`group` AS `group`,
  `c`.`shift` AS `shift`,
  `cr`.`name` AS `classroomName`,
  `cr`.`classroom_key` AS `classroomKey`,
  `sices_v3`.`vep`.`modality` AS `modality`,
  `sices_v3`.`vep`.`academicDiscipline` AS `academicDiscipline`,
  `sices_v3`.`vep`.`offeredEducationLevel` AS `offeredEducationLevel`,
  `sy`.`school_year` AS `schoolYear`,
  `sap`.`semiannual_period` AS `semiannualPeriod`,
  `sices_v3`.`vep`.`name` AS `educationalProgram`,
  `sices_v3`.`vtl`.`subjectId` AS `subjectId`,
  `tls`.`teaching_load_id` AS `teachingLoadId`,
  `tls`.`day_id` AS `dayId`,
  `tls`.`hour_id` AS `hourId`,
  `tls`.`classroom_id` AS `classroomId`,
  `sices_v3`.`vtl`.`studyPlanId` AS `studyPlanId`,
  `c`.`educational_program_id` AS `educationalProgramId`
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
                    (
                      `sices_v3`.`teaching_load_schedule` `tls`
                      LEFT JOIN `sices_v3`.`view_teaching_load` `vtl` ON(
                        (`tls`.`teaching_load_id` = `sices_v3`.`vtl`.`id`)
                      )
                    )
                    LEFT JOIN `sices_v3`.`study_plans` `sp` ON((`sices_v3`.`vtl`.`studyPlanId` = `sp`.`id`))
                  )
                  LEFT JOIN `sices_v3`.`classes` `c` ON((`sices_v3`.`vtl`.`classId` = `c`.`id`))
                )
                LEFT JOIN `sices_v3`.`week_days` `wd` ON((`tls`.`day_id` = `wd`.`id`))
              )
              LEFT JOIN `sices_v3`.`weekly_hours` `wh` ON((`tls`.`hour_id` = `wh`.`id`))
            )
            LEFT JOIN `sices_v3`.`classrooms` `cr` ON((`tls`.`classroom_id` = `cr`.`id`))
          )
          LEFT JOIN `sices_v3`.`semesters` `sem` ON((`sp`.`semester_id` = `sem`.`id`))
        )
        LEFT JOIN `sices_v3`.`school_years` `sy` ON((`c`.`school_year_id` = `sy`.`id`))
      )
      LEFT JOIN `sices_v3`.`semiannual_periods` `sap` ON((`c`.`semiannual_period_id` = `sap`.`id`))
    )
    LEFT JOIN `sices_v3`.`view_educational_programs` `vep` ON(
      (
        `c`.`educational_program_id` = `sices_v3`.`vep`.`id`
      )
    )
  )