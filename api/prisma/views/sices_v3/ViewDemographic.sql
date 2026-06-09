SELECT
  `d`.`id` AS `id`,
  `p`.`id` AS `person_id`,
  `p`.`curp` AS `curp`,
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
  ) AS `full_name`,
  `p`.`first_name` AS `first_name`,
  `p`.`first_last_name` AS `first_last_name`,
  `p`.`second_last_name` AS `second_last_name`,
  `p`.`gender` AS `gender`,
  timestampdiff(YEAR, `p`.`birth_date`, curdate()) AS `age`,
  `ms`.`status` AS `marital_status`,
  `il`.`name` AS `indigenous_language`,
  `fl`.`name` AS `foreign_language`,
  `sc`.`name` AS `special_condition`,
  `d`.`is_indigenous` AS `is_indigenous`,
  `d`.`is_afro_descendant` AS `is_afro_descendant`
FROM
  (
    (
      (
        (
          (
            `sices_v3`.`demographics` `d`
            JOIN `sices_v3`.`persons` `p` ON((`d`.`person_id` = `p`.`id`))
          )
          LEFT JOIN `sices_v3`.`marital_statuses` `ms` ON((`d`.`marital_status_id` = `ms`.`id`))
        )
        LEFT JOIN `sices_v3`.`indigenous_languages` `il` ON((`d`.`indigenous_lang_id` = `il`.`id`))
      )
      LEFT JOIN `sices_v3`.`foreign_languages` `fl` ON((`d`.`foreign_lang_id` = `fl`.`id`))
    )
    LEFT JOIN `sices_v3`.`special_conditions` `sc` ON((`d`.`special_condition_id` = `sc`.`id`))
  )