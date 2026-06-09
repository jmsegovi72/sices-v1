SELECT
  `ec`.`id` AS `id`,
  `p`.`id` AS `person_id`,
  `p`.`curp` AS `person_curp`,
  trim(
    REPLACE(
      concat_ws(
        ' ',
        `p`.`first_name`,
        `p`.`first_last_name`,
        `p`.`second_last_name`
      ),
      '  ',
      ' '
    )
  ) AS `person_name`,
  `ec`.`full_name` AS `contact_name`,
  `ec`.`phone` AS `contact_phone`,
  `r`.`name` AS `relationship`
FROM
  (
    (
      `sices_v3`.`emergency_contacts` `ec`
      JOIN `sices_v3`.`persons` `p` ON((`ec`.`person_id` = `p`.`id`))
    )
    LEFT JOIN `sices_v3`.`contact_relationships` `r` ON((`ec`.`relationship_id` = `r`.`id`))
  )