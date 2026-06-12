SELECT
  `s`.`id` AS `id`,
  `sices_v3`.`vp`.`id` AS `personId`,
  `sices_v3`.`vp`.`fullName` AS `fullName`,
  `sices_v3`.`vp`.`firstName` AS `firstName`,
  `sices_v3`.`vp`.`firstLastName` AS `firstLastName`,
  `sices_v3`.`vp`.`secondLastName` AS `secondLastName`,
  `sices_v3`.`vp`.`curp` AS `curp`,
  `sices_v3`.`vp`.`gender` AS `gender`,
  `sices_v3`.`vp`.`age` AS `age`,
  `sices_v3`.`vp`.`phone` AS `phone`,
  `sices_v3`.`vp`.`birthState` AS `birthState`,
  `sices_v3`.`vp`.`birthMunicipality` AS `birthMunicipality`,
  `sices_v3`.`vp`.`photoUrl` AS `photoUrl`,
  `s`.`code_number` AS `studentCode`,
  `s`.`institutional_mail` AS `institutionalMail`,
  `ep`.`name` AS `educationalProgram`,
  `ep`.`code` AS `programCode`,
  `ep`.`study_plan` AS `studyPlan`,
  `ad`.`name` AS `academicDiscipline`,
  `sol`.`offered_education_level` AS `educationLevel`,
  `md`.`name` AS `modality`,
  `sg`.`cardinal_number` AS `generation`,
(
    CASE
      WHEN (
        `sol`.`offered_education_level` IN ('Maestría', 'Doctorado')
      ) THEN `sg`.`masters_degree_cycle`
      ELSE `sg`.`bachelor_degree_cycle`
    END
  ) AS `educationCycle`,
  `ss`.`description` AS `statusDescription`,
  `ss`.`status_key` AS `statusKey`,
  `ss`.`is_active` AS `isActive`,
(
    SELECT
      max(`sem`.`number`)
    FROM
      (
        (
          `sices_v3`.`enrollments` `e`
          JOIN `sices_v3`.`classes` `c` ON((`c`.`id` = `e`.`class_id`))
        )
        JOIN `sices_v3`.`semesters` `sem` ON((`sem`.`id` = `c`.`semester_id`))
      )
    WHERE
      (`e`.`student_id` = `s`.`id`)
  ) AS `currentSemester`
FROM
  (
    (
      (
        (
          (
            (
              (
                `sices_v3`.`students` `s`
                JOIN `sices_v3`.`view_persons` `vp` ON((`sices_v3`.`vp`.`id` = `s`.`person_id`))
              )
              LEFT JOIN `sices_v3`.`educational_programs` `ep` ON((`ep`.`id` = `s`.`educational_program_id`))
            )
            LEFT JOIN `sices_v3`.`academic_disciplines` `ad` ON((`ad`.`id` = `ep`.`academic_discipline_id`))
          )
          LEFT JOIN `sices_v3`.`school_offered_levels` `sol` ON((`sol`.`id` = `ad`.`school_offered_level_id`))
        )
        LEFT JOIN `sices_v3`.`modalities` `md` ON((`md`.`id` = `ep`.`modality_id`))
      )
      LEFT JOIN `sices_v3`.`student_generations` `sg` ON((`sg`.`id` = `s`.`generation_id`))
    )
    LEFT JOIN `sices_v3`.`student_status` `ss` ON((`ss`.`id` = `s`.`status_id`))
  )
ORDER BY
  `sices_v3`.`vp`.`firstLastName`,
  `sices_v3`.`vp`.`secondLastName`,
  `sices_v3`.`vp`.`firstName`