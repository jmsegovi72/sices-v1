SELECT
  `e`.`id` AS `id`,
  `s`.`id` AS `studentId`,
  `p`.`curp` AS `curp`,
  `s`.`code_number` AS `studentNumber`,
  `p`.`first_name` AS `firstName`,
  `p`.`first_last_name` AS `firstLastName`,
  `p`.`second_last_name` AS `secondLastName`,
  concat(
    `p`.`first_name`,
    ' ',
    `p`.`first_last_name`,
    IF(
      (`p`.`second_last_name` <> ''),
      concat(' ', `p`.`second_last_name`),
      ''
    )
  ) AS `fullName`,
  `p`.`gender` AS `gender`,
  `c`.`class_code` AS `classCode`,
  `e`.`list_number` AS `listNumber`,
  `sem`.`number` AS `semester`,
  `sy`.`school_year` AS `schoolYear`,
  `sp`.`semiannual_period` AS `semiannualPeriod`,
  `ep`.`name` AS `educationalProgram`,
  `ad`.`name` AS `academicDiscipline`,
  `sol`.`offered_education_level` AS `educationLevel`,
  `e`.`enrollment_date` AS `enrollmentDate`
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
                    `sices_v3`.`enrollments` `e`
                    JOIN `sices_v3`.`students` `s` ON((`e`.`student_id` = `s`.`id`))
                  )
                  JOIN `sices_v3`.`persons` `p` ON((`s`.`person_id` = `p`.`id`))
                )
                JOIN `sices_v3`.`classes` `c` ON((`e`.`class_id` = `c`.`id`))
              )
              JOIN `sices_v3`.`semesters` `sem` ON((`c`.`semester_id` = `sem`.`id`))
            )
            JOIN `sices_v3`.`school_years` `sy` ON((`c`.`school_year_id` = `sy`.`id`))
          )
          JOIN `sices_v3`.`semiannual_periods` `sp` ON((`c`.`semiannual_period_id` = `sp`.`id`))
        )
        JOIN `sices_v3`.`educational_programs` `ep` ON((`c`.`educational_program_id` = `ep`.`id`))
      )
      JOIN `sices_v3`.`academic_disciplines` `ad` ON((`ep`.`academic_discipline_id` = `ad`.`id`))
    )
    JOIN `sices_v3`.`school_offered_levels` `sol` ON((`ad`.`school_offered_level_id` = `sol`.`id`))
  )