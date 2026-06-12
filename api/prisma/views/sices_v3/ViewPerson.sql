SELECT
  `p`.`id` AS `id`,
  `p`.`curp` AS `curp`,
  `p`.`first_name` AS `firstName`,
  `p`.`first_last_name` AS `firstLastName`,
  `p`.`second_last_name` AS `secondLastName`,
  concat(
    `p`.`first_name`,
    ' ',
    `p`.`first_last_name`,
    IF(
      (`p`.`second_last_name` <> ''),
      concat(' ', `p`.`second_last_name`),
      ''
    )
  ) AS `fullName`,
  `p`.`gender` AS `gender`,
  `p`.`birth_date` AS `birthDate`,
  timestampdiff(YEAR, `p`.`birth_date`, curdate()) AS `age`,
  `p`.`nationality` AS `nationality`,
  `s`.`name` AS `birthState`,
  `p`.`municipality_id` AS `municipalityId`,
  `m`.`municipality` AS `birthMunicipality`,
  `p`.`phone` AS `phone`,
  `p`.`personal_email` AS `personalEmail`,
  `p`.`rfc` AS `rfc`,
  `p`.`photo_url` AS `photoUrl`
FROM
  (
    (
      `sices_v3`.`persons` `p`
      LEFT JOIN `sices_v3`.`states` `s` ON((`p`.`state_id` = `s`.`id`))
    )
    LEFT JOIN `sices_v3`.`municipalities` `m` ON((`p`.`municipality_id` = `m`.`id`))
  )