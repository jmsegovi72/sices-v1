SELECT
  IFNULL(`s`.`id`, 0) AS `id`,
  IFNULL(`sices_v3`.`vp`.`id`, 0) AS `person_id`,
  `sices_v3`.`vp`.`full_name` AS `full_name`,
  `sices_v3`.`vp`.`first_name` AS `first_name`,
  `sices_v3`.`vp`.`first_last_name` AS `first_last_name`,
  `sices_v3`.`vp`.`second_last_name` AS `second_last_name`,
  `sices_v3`.`vp`.`curp` AS `curp`,
  `sices_v3`.`vp`.`gender` AS `gender`,
  `sices_v3`.`vp`.`age` AS `age`,
  `sices_v3`.`vp`.`personal_phone` AS `personal_phone`,
  `sices_v3`.`vp`.`birth_state` AS `birth_state`,
  `sices_v3`.`vp`.`birth_municipality` AS `birth_municipality`,
  `s`.`code_number` AS `student_code`,
  `s`.`institutional_mail` AS `institutional_mail`,
  `ep`.`name` AS `educational_program`,
  `ep`.`code` AS `program_code`,
  `ep`.`study_plan` AS `study_plan`,
  `ad`.`name` AS `academic_discipline`,
  `sol`.`offered_education_level` AS `education_level`,
  `md`.`name` AS `modality`,
  `sg`.`cardinal_number` AS `generation`,
(
    CASE
      WHEN (
        `sol`.`offered_education_level` IN ('Maestría', 'Doctorado')
      ) THEN `sg`.`masters_degree_cycle`
      ELSE `sg`.`bachelor_degree_cycle`
    END
  ) AS `education_cycle`,
  coalesce(`ss`.`description`, 'En proceso') AS `status_description`,
  `ss`.`status_key` AS `status_key`,
  coalesce(`ss`.`is_active`, 0) AS `is_active`,
  coalesce(
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
    ),
    0
  ) AS `current_semester`
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
  `sices_v3`.`vp`.`first_last_name`,
  `sices_v3`.`vp`.`second_last_name`,
  `sices_v3`.`vp`.`first_name`