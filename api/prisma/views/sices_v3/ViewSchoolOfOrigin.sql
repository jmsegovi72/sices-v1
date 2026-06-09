SELECT
  `s`.`id` AS `id`,
  `s`.`cct` AS `cct`,
  `s`.`name` AS `school_name`,
  `s`.`funding_source` AS `funding_source`,
  `ol`.`offered_education_level` AS `education_level`,
  `m`.`municipality` AS `municipality_name`,
  `st`.`name` AS `state_name`
FROM
  (
    (
      (
        `sices_v3`.`schools_of_origin` `s`
        JOIN `sices_v3`.`school_offered_levels` `ol` ON((`s`.`offered_level_id` = `ol`.`id`))
      )
      JOIN `sices_v3`.`municipalities` `m` ON((`s`.`municipality_id` = `m`.`id`))
    )
    JOIN `sices_v3`.`states` `st` ON((`m`.`state_id` = `st`.`id`))
  )