SELECT
  `u`.`id` AS `id`,
  `u`.`username` AS `username`,
  `u`.`password` AS `password`,
  `p`.`first_name` AS `first_name`,
  `p`.`first_last_name` AS `first_last_name`,
  `p`.`second_last_name` AS `second_last_name`,
  trim(
    concat(
      `p`.`first_name`,
      ' ',
      `p`.`first_last_name`,
      ' ',
      `p`.`second_last_name`
    )
  ) AS `full_name`,
  `u`.`is_active` AS `is_active`,
  `u`.`is_first_login` AS `is_first_login`,
  `u`.`login_attempts` AS `login_attempts`,
  `u`.`locked_until` AS `locked_until`,
  `u`.`photo_url` AS `photo_url`,
  `r`.`id` AS `role_id`,
  `r`.`name` AS `role_name`,
  `r`.`description` AS `role_description`,
  `ut`.`id` AS `user_type_id`,
  `ut`.`code` AS `user_type_code`,
  `ut`.`name` AS `user_type_name`,
  `ut`.`description` AS `user_type_description`
FROM
  (
    (
      (
        `sices_v3`.`users` `u`
        JOIN `sices_v3`.`persons` `p` ON((`u`.`person_id` = `p`.`id`))
      )
      JOIN `sices_v3`.`roles` `r` ON((`u`.`role_id` = `r`.`id`))
    )
    JOIN `sices_v3`.`user_types` `ut` ON((`u`.`user_type_id` = `ut`.`id`))
  )