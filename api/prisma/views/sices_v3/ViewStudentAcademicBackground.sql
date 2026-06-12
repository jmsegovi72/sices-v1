SELECT
  `sab`.`id` AS `id`,
  `sab`.`student_id` AS `student_id`,
  `sices_v3`.`vp`.`fullName` AS `student_full_name`,
  `sices_v3`.`vp`.`curp` AS `student_curp`,
  `s`.`code_number` AS `student_code`,
  `sab`.`average` AS `average`,
  `so`.`cct` AS `school_cct`,
  `so`.`name` AS `school_name`,
  `so`.`funding_source` AS `school_funding_source`,
  `sol`.`offered_education_level` AS `school_offered_level`,
  `m`.`municipality` AS `school_municipality`,
  `st`.`name` AS `school_state`,
  `pd`.`name` AS `professional_degree`
FROM
  (
    (
      (
        (
          (
            (
              (
                `sices_v3`.`student_academic_backgrounds` `sab`
                JOIN `sices_v3`.`students` `s` ON((`s`.`id` = `sab`.`student_id`))
              )
              JOIN `sices_v3`.`view_persons` `vp` ON((`sices_v3`.`vp`.`id` = `s`.`person_id`))
            )
            LEFT JOIN `sices_v3`.`schools_of_origin` `so` ON((`so`.`id` = `sab`.`school_of_origin_id`))
          )
          LEFT JOIN `sices_v3`.`school_offered_levels` `sol` ON((`sol`.`id` = `so`.`offered_level_id`))
        )
        LEFT JOIN `sices_v3`.`municipalities` `m` ON((`m`.`id` = `so`.`municipality_id`))
      )
      LEFT JOIN `sices_v3`.`states` `st` ON((`st`.`id` = `m`.`state_id`))
    )
    JOIN `sices_v3`.`professional_degrees` `pd` ON((`pd`.`id` = `sab`.`professional_degree_id`))
  )
ORDER BY
  `sices_v3`.`vp`.`firstLastName`,
  `sices_v3`.`vp`.`secondLastName`,
  `sices_v3`.`vp`.`firstName`