SELECT
  `a`.`id` AS `id`,
  `st`.`abbreviation` AS `street_type`,
  `a`.`street` AS `street`,
  `a`.`exterior_number` AS `exterior_number`,
  `a`.`interior_number` AS `interior_number`,
  `a`.`block` AS `block`,
  `a`.`between_streets` AS `between_streets`,
  `p`.`curp` AS `curp`,
  concat_ws(
    ' ',
    `p`.`first_name`,
    `p`.`first_last_name`,
    `p`.`second_last_name`
  ) AS `full_name`,
  `sices_v3`.`vzc`.`zip_code` AS `zip_code`,
  `sices_v3`.`vzc`.`settlement` AS `settlement`,
  `sices_v3`.`vzc`.`abbreviation` AS `settlement_type`,
  `sices_v3`.`vzc`.`locality` AS `locality`,
  `sices_v3`.`vzc`.`municipality` AS `municipality_name`,
  `sices_v3`.`vzc`.`municipal_capital` AS `municipal_capital`,
  `sices_v3`.`vzc`.`municipality_id` AS `municipality_id`,
  `sices_v3`.`vzc`.`state_id` AS `state_id`,
  `sices_v3`.`vzc`.`state_name` AS `state_name`,
  IF(
    (`st`.`abbreviation` = 'NE'),
    'No especificada',
    trim(
      concat_ws(
        ', ',
        nullif(
          trim(
            concat_ws(
              ' ',
              `st`.`abbreviation`,
              `a`.`street`,
              IF(
                (`a`.`exterior_number` <> ''),
                concat('no. ', `a`.`exterior_number`),
                NULL
              )
            )
          ),
          ''
        ),
        nullif(
          trim(
            concat_ws(
              ' ',
              IF(
                (`a`.`interior_number` <> ''),
                concat('int. ', `a`.`interior_number`),
                NULL
              ),
              IF((`a`.`block` <> ''), `a`.`block`, NULL),
              IF(
                (`a`.`between_streets` <> ''),
                concat('entre ', `a`.`between_streets`),
                NULL
              )
            )
          ),
          ''
        ),
        nullif(`sices_v3`.`vzc`.`zip_code`, ''),
        nullif(
          trim(
            concat_ws(
              ' ',
              `sices_v3`.`vzc`.`abbreviation`,
              `sices_v3`.`vzc`.`settlement`
            )
          ),
          ''
        ),
        nullif(`sices_v3`.`vzc`.`municipal_capital`, ''),
        nullif(`sices_v3`.`vzc`.`municipality`, ''),
        nullif(`sices_v3`.`vzc`.`state_name`, '')
      )
    )
  ) AS `full_address`
FROM
  (
    (
      (
        `sices_v3`.`addresses` `a`
        JOIN `sices_v3`.`persons` `p` ON((`a`.`person_id` = `p`.`id`))
      )
      JOIN `sices_v3`.`street_types` `st` ON((`a`.`street_type_id` = `st`.`id`))
    )
    JOIN `sices_v3`.`view_zip_codes` `vzc` ON((`a`.`zip_code_id` = `sices_v3`.`vzc`.`id`))
  )
ORDER BY
  `a`.`id`