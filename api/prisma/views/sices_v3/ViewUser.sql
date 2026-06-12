SELECT
  `u`.`id` AS `id`,
  `u`.`username` AS `username`,
  `u`.`password` AS `password`,
  `p`.`first_name` AS `firstName`,
  `p`.`first_last_name` AS `firstLastName`,
  `p`.`second_last_name` AS `secondLastName`,
  trim(
    concat(
      IFNULL(`p`.`first_name`, ''),
      ' ',
      IFNULL(`p`.`first_last_name`, ''),
      ' ',
      IFNULL(`p`.`second_last_name`, '')
    )
  ) AS `fullName`,
  `u`.`is_active` AS `isActive`,
  `u`.`is_first_login` AS `isFirstLogin`,
  `u`.`login_attempts` AS `loginAttempts`,
  `u`.`locked_until` AS `lockedUntil`,
  `r`.`id` AS `roleId`,
  `r`.`name` AS `roleName`,
  `r`.`description` AS `roleDescription`,
  `ut`.`id` AS `userTypeId`,
  `ut`.`code` AS `userTypeCode`,
  `ut`.`name` AS `userTypeName`,
  `ut`.`description` AS `userTypeDescription`,
  `p`.`photo_url` AS `photoUrl`
FROM
  (
    (
      (
        `sices_v3`.`users` `u`
        LEFT JOIN `sices_v3`.`persons` `p` ON((`u`.`person_id` = `p`.`id`))
      )
      LEFT JOIN `sices_v3`.`roles` `r` ON((`u`.`role_id` = `r`.`id`))
    )
    LEFT JOIN `sices_v3`.`user_types` `ut` ON((`u`.`user_type_id` = `ut`.`id`))
  )