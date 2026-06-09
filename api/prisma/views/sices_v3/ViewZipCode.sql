SELECT
  `z`.`id` AS `id`,
  `z`.`zip_code` AS `zip_code`,
  `z`.`settlement` AS `settlement`,
  `st`.`settlement_type` AS `settlement_type`,
  `st`.`abbreviation` AS `abbreviation`,
  `z`.`locality` AS `locality`,
  `z`.`zone_type` AS `zone_type`,
  `m`.`municipality` AS `municipality`,
  `m`.`municipal_capital` AS `municipal_capital`,
  `m`.`id` AS `municipality_id`,
  `s`.`id` AS `state_id`,
  `s`.`name` AS `state_name`
FROM
  (
    (
      (
        `sices_v3`.`zip_codes` `z`
        JOIN `sices_v3`.`settlement_types` `st` ON((`z`.`settlement_type_id` = `st`.`id`))
      )
      JOIN `sices_v3`.`municipalities` `m` ON((`z`.`municipality_id` = `m`.`id`))
    )
    JOIN `sices_v3`.`states` `s` ON((`m`.`state_id` = `s`.`id`))
  )
ORDER BY
  `z`.`id`