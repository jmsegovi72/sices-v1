SELECT
  `c`.`id` AS `id`,
  `c`.`class_code` AS `classCode`,
  `c`.`group` AS `group`,
  `c`.`shift` AS `shift`,
  `c`.`elective` AS `elective`,
  `sy`.`school_year` AS `schoolYear`,
  `sp`.`semiannual_period` AS `semiannualPeriod`,
  `s`.`number` AS `semester`,
  `ep`.`code` AS `educationalProgramCode`,
  `ep`.`name` AS `educationalProgram`,
  `ep`.`study_plan` AS `studyPlan`,
  `ad`.`name` AS `academicDiscipline`,
  `sol`.`offered_education_level` AS `educationLevel`,
  `m`.`name` AS `modality`
FROM
  (
    (
      (
        (
          (
            (
              (
                `sices_v3`.`classes` `c`
                JOIN `sices_v3`.`educational_programs` `ep` ON((`c`.`educational_program_id` = `ep`.`id`))
              )
              JOIN `sices_v3`.`academic_disciplines` `ad` ON((`ep`.`academic_discipline_id` = `ad`.`id`))
            )
            JOIN `sices_v3`.`school_offered_levels` `sol` ON((`ad`.`school_offered_level_id` = `sol`.`id`))
          )
          JOIN `sices_v3`.`modalities` `m` ON((`ep`.`modality_id` = `m`.`id`))
        )
        JOIN `sices_v3`.`school_years` `sy` ON((`c`.`school_year_id` = `sy`.`id`))
      )
      JOIN `sices_v3`.`semiannual_periods` `sp` ON((`c`.`semiannual_period_id` = `sp`.`id`))
    )
    JOIN `sices_v3`.`semesters` `s` ON((`c`.`semester_id` = `s`.`id`))
  )